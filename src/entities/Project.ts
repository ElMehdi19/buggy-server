import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import Report from "./Report";

@Entity()
class Project extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { nullable: false, unique: true })
  name: string;

  @Column("text", { default: "general", nullable: false })
  departement: string;

  @OneToMany(() => Report, (report) => report.project)
  reports: Report[];
}

export default Project;
