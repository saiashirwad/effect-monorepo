import * as HttpApi from "@effect/platform/HttpApi";
import { TodosContract } from "./api/Contracts.js";

export class DomainApi extends HttpApi.make("domain").add(TodosContract.Group) {}
