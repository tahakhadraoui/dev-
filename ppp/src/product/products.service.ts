import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from 'src/category/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(query: any): Promise<{ products: Product[], total: number, page: number, totalPages: number }> {
    const { category, minPrice, maxPrice, search, sortBy, page = 1, limit = 12 } = query;
    
    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.orderItems', 'orderItems');

    if (category && category !== 'All') {
      queryBuilder.andWhere('category.name = :category', { category });
    }

    if (minPrice) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (search) {
      queryBuilder.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        queryBuilder.orderBy('product.price', 'ASC');
        break;
      case 'price-high':
        queryBuilder.orderBy('product.price', 'DESC');
        break;
      case 'rating':
        queryBuilder.orderBy('product.rating', 'DESC');
        break;
      case 'name':
        queryBuilder.orderBy('product.name', 'ASC');
        break;
      default:
        queryBuilder.orderBy('product.createdAt', 'DESC');
    }

    const [products, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      products,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'orderItems'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, ...rest } = createProductDto;

    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    const product = this.productRepository.create({
      ...rest,
      status: rest.status || 'active',
      rating: rest.rating || 0,
      reviewCount: rest.reviewCount || 0,
      salesCount: rest.salesCount || 0,
      category,
    });

    const savedProduct = await this.productRepository.save(product);

    // Update category productCount
    await this.categoryRepository.increment({ id: categoryId }, 'productCount', 1);

    return savedProduct;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findOne({ where: { id: updateProductDto.categoryId } });
      if (!category) {
        throw new NotFoundException(`Category with ID ${updateProductDto.categoryId} not found`);
      }
      if (product.category.id !== updateProductDto.categoryId) {
        // Decrease old category's productCount
        await this.categoryRepository.decrement({ id: product.category.id }, 'productCount', 1);
        // Increase new category's productCount
        await this.categoryRepository.increment({ id: updateProductDto.categoryId }, 'productCount', 1);
        product.category = category;
      }
    }

    Object.assign(product, updateProductDto);

    return this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    // Decrease category's productCount
    await this.categoryRepository.decrement({ id: product.category.id }, 'productCount', 1);
  }
}