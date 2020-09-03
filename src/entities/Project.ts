import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
  ManyToOne,
} from "typeorm";
import Report from "./Report";
import Notification from "./Notification";
import User from "./User";

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

  @OneToMany(() => Notification, (notification) => notification.project, {
    cascade: true,
  })
  notifications: Notification[];

  @ManyToOne(() => User, (user) => user.managingProjects)
  manager: User;

  @ManyToMany(() => User, (user) => user.projects)
  @JoinTable()
  users: User[];
}

export default Project;
