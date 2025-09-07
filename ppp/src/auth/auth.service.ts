import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common"
import  { JwtService } from "@nestjs/jwt"
import  { UsersService } from "../users/users.service"
import * as bcrypt from "bcrypt"
import  { User } from "../users/entities/user.entity"
import { plainToClass } from "class-transformer"
import { UserResponseDto } from "../users/dto/user-response.dto"
import  { CreateUserDto } from "../users/dto/create-user.dto"
import  { ConfigService } from "@nestjs/config"
import  { ChangePasswordDto } from "./dto/change-password.dto"
import  { ResetPasswordDto } from "./dto/reset-password.dto"
import  { MailService } from "../mail/mail.service"

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto)
      if (!user.isActive) {
        return {
          message: "Account created successfully. Please wait for an admin to activate your account.",
          user: plainToClass(UserResponseDto, user),
        }
      }

      const tokens = await this.getTokens(user.id, user.email, user.role)
      await this.updateRefreshToken(user.id, tokens.refreshToken)

      return {
        user: plainToClass(UserResponseDto, user),
        ...tokens,
      }
    } catch (error) {
      console.error("Error during registration:", error)
      throw new UnauthorizedException("Registration failed")
    }
  }

  async validateUser(email: string, password: string): Promise<User> {
    try {
      console.log(`Validating user with email: ${email}`)

      // SOLUTION: Utiliser findByEmailRaw pour obtenir l'entité User complète
      const user = await this.usersService.findByEmailRaw(email)
      if (!user) {
        console.log("User not found")
        throw new UnauthorizedException("Invalid credentials")
      }

      console.log("Comparing password with hash:", {
        providedPassword: password,
        storedHash: user.password?.substring(0, 20) + "...", // Log partial hash for debugging
        hasPassword: !!user.password,
        passwordLength: user.password?.length,
      })

      // DÉBOGAGE: Vérifier si le mot de passe existe
      if (!user.password) {
        console.log("ERROR: User password is null or undefined")
        throw new UnauthorizedException("Invalid credentials")
      }

      const isPasswordValid = await bcrypt.compare(password, user.password)
      console.log("Password comparison result:", isPasswordValid)

      if (!isPasswordValid) {
        console.log("Invalid password")
        throw new UnauthorizedException("Invalid credentials")
      }

      if (!user.isActive) {
        console.log("User account is inactive")
        throw new UnauthorizedException("Account inactive")
      }

      console.log("User validated successfully")
      return user
    } catch (error) {
      console.error("Error during user validation:", error)
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException("Account inactive please wait for admin approval")
    }
  }

  async login(user: User) {
    try {
      console.log(`Logging in user with ID: ${user.id}`)
      const tokens = await this.getTokens(user.id, user.email, user.role)
      await this.updateRefreshToken(user.id, tokens.refreshToken)
      console.log("Login successful")
      return {
        user: plainToClass(UserResponseDto, user),
        ...tokens,
      }
    } catch (error) {
      console.error("Error during login:", error)
      throw new UnauthorizedException("Login failed")
    }
  }

  async getProfile(user: User) {
    try {
      return plainToClass(UserResponseDto, user)
    } catch (error) {
      console.error("Error fetching profile:", error)
      throw new UnauthorizedException("Failed to fetch profile")
    }
  }

  async refreshTokens(userId: string) {
    try {
      console.log(`Refreshing tokens for user ID: ${userId}`)
      const user = await this.usersService.findOne(userId, {
        relations: ["joinedMatches", "teams", "receivedRatings"],
      })

      if (!user || !user.refreshToken) {
        console.log("Invalid refresh token or user not found")
        throw new UnauthorizedException("Access Denied")
      }

      const tokens = await this.getTokens(user.id, user.email, user.role)
      await this.updateRefreshToken(user.id, tokens.refreshToken)
      console.log("Tokens refreshed successfully")
      return tokens
    } catch (error) {
      console.error("Error during token refresh:", error)
      throw new UnauthorizedException("Failed to refresh tokens")
    }
  }

  async logout(userId: string) {
    try {
      console.log(`Logging out user with ID: ${userId}`)
      await this.usersService.update(userId, { isLoggedOut: true }, {} as User)
      console.log("Logout successful")
      return { message: "Logout successful" }
    } catch (error) {
      console.error("Error during logout:", error)
      throw new UnauthorizedException("Logout failed")
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    try {
      console.log(`Changing password for user ID: ${userId}`)

      // Get user with current password using the raw method
      const user = await this.usersService.findOneRaw(userId)
      if (!user) {
        throw new UnauthorizedException("User not found")
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password)

      if (!isCurrentPasswordValid) {
        throw new BadRequestException("Current password is incorrect")
      }

      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(changePasswordDto.newPassword, user.password)

      if (isSamePassword) {
        throw new BadRequestException("New password must be different from current password")
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10)

      // Update password
      await this.usersService.updateRaw(userId, { password: hashedNewPassword })

      console.log("Password changed successfully")
      return { message: "Password changed successfully" }
    } catch (error) {
      console.error("Error changing password:", error)
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new UnauthorizedException("Failed to change password")
    }
  }

  async forgotPassword(email: string) {
    try {
      console.log(`Processing forgot password for email: ${email}`)

      // Find user by email using raw method
      const user = await this.usersService.findByEmailRaw(email)
      if (!user) {
        // Don't reveal if email exists or not for security
        return { message: "If the email exists, a reset code has been sent" }
      }

      // Generate 6-digit reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString()

      // Set expiration time (15 minutes from now)
      const resetTokenExpires = new Date()
      resetTokenExpires.setMinutes(resetTokenExpires.getMinutes() + 15)

      // Hash the reset code before storing
      const hashedResetCode = await bcrypt.hash(resetCode, 10)

      // Update user with reset token and expiration
      await this.usersService.updateRaw(user.id, {
        resetToken: hashedResetCode,
        resetTokenExpires: resetTokenExpires,
      })

      // Send email with reset code
      await this.mailService.sendPasswordResetEmail(email, resetCode)

      console.log("Password reset email sent successfully")
      return { message: "If the email exists, a reset code has been sent" }
    } catch (error) {
      console.error("Error processing forgot password:", error)
      throw new BadRequestException("Failed to process password reset request")
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      console.log(`Processing password reset for email: ${resetPasswordDto.email}`)

      // Find user by email using raw method
      const user = await this.usersService.findByEmailRaw(resetPasswordDto.email)
      if (!user || !user.resetToken || !user.resetTokenExpires) {
        throw new BadRequestException("Invalid or expired reset code")
      }

      // Check if reset token has expired
      if (new Date() > user.resetTokenExpires) {
        throw new BadRequestException("Reset code has expired")
      }

      // Verify reset code
      const isResetCodeValid = await bcrypt.compare(resetPasswordDto.resetCode, user.resetToken)

      if (!isResetCodeValid) {
        throw new BadRequestException("Invalid reset code")
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10)
      console.log("New hashed password created:", hashedNewPassword.substring(0, 20) + "...")

      // Update password and clear reset token using raw update
      await this.usersService.updateRaw(user.id, {
        password: hashedNewPassword,
        resetToken: undefined,
        resetTokenExpires: undefined,
      })

      console.log("Password reset successfully - database updated")
      return { message: "Password reset successfully" }
    } catch (error) {
      console.error("Error resetting password:", error)
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException("Failed to reset password")
    }
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    try {
      console.log(`Updating refresh token for user ID: ${userId}`)
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10)
      await this.usersService.update(userId, { refreshToken: hashedRefreshToken }, {} as User)
      console.log("Refresh token updated successfully")
    } catch (error) {
      console.error("Error updating refresh token:", error)
      throw new UnauthorizedException("Failed to update refresh token")
    }
  }

  private async getTokens(userId: string, email: string, role: string) {
    try {
      console.log(`Generating tokens for user ID: ${userId}`)
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(
          { sub: userId, email, role },
          {
            secret: this.configService.get<string>("JWT_SECRET"),
            expiresIn: "5h",
          },
        ),
        this.jwtService.signAsync(
          { sub: userId, email, role },
          {
            secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
            expiresIn: "7d",
          },
        ),
      ])

      console.log("Tokens generated successfully")
      return {
        accessToken,
        refreshToken,
      }
    } catch (error) {
      console.error("Error generating tokens:", error)
      throw new UnauthorizedException("Failed to generate tokens")
    }
  }
}
