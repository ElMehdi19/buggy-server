import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
} from "typeorm";
import Project from "./Project";

@Entity()
class Notification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { default: () => `date('now')` })
  created: string;

  @Column("text", { nullable: false })
  notification: string;

  @ManyToOne(() => Project, (project) => project.notifications)
  project: Project;
}

export default Notification;
