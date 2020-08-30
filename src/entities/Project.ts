import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import Report from "./Report";
import Notification from "./Notification";

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

  @OneToMany(() => Notification, (notification) => notification.project)
  notifications: Notification[];
}

export default Project;
