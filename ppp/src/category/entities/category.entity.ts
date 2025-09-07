// entities/category.entity.ts
import { Product } from 'src/product/entities/product.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  icon: string;

  @Column('int', { default: 0 })
  productCount: number;

  @OneToMany(() => Product, product => product.category)
  products: Product[];
}