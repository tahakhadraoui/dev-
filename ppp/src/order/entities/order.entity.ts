// entities/order.entity.ts
import { OrderItem } from 'src/order-item/entities/order-item.entity';
import { User } from 'src/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';


@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderNumber: string;
  @ManyToOne(() => User, user => user.orders)
  user: User;


  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2 })
  shipping: number;

  @Column('decimal', { precision: 10, scale: 2 })
  tax: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column({ default: 'pending' })
  status: string; // pending, completed, shipped, cancelled

  @Column('json')
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    city: string;
    zipCode: string;
  };

  @Column('json')
  paymentMethod: {
    type: string;
    last4?: string;
  };

  @OneToMany(() => OrderItem, orderItem => orderItem.order) 
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;
}