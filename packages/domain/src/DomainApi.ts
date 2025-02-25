import * as HttpApi from "@effect/platform/HttpApi"
import { MeGroup } from "./api/Me.js"

export class DomainApi extends HttpApi.make("domain").add(MeGroup) {}
