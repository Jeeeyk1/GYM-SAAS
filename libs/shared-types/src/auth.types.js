"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffStatus = exports.ActorType = exports.CheckInMethod = exports.MemberStatus = exports.ClientPlan = exports.ClientStatus = void 0;
var ClientStatus;
(function (ClientStatus) {
    ClientStatus["ONBOARDING"] = "onboarding";
    ClientStatus["ACTIVE"] = "active";
    ClientStatus["SUSPENDED"] = "suspended";
    ClientStatus["DEMO"] = "demo";
    ClientStatus["CHURNED"] = "churned";
})(ClientStatus || (exports.ClientStatus = ClientStatus = {}));
var ClientPlan;
(function (ClientPlan) {
    ClientPlan["STARTER"] = "starter";
    ClientPlan["GROWTH"] = "growth";
    ClientPlan["ENTERPRISE"] = "enterprise";
})(ClientPlan || (exports.ClientPlan = ClientPlan = {}));
var MemberStatus;
(function (MemberStatus) {
    MemberStatus["ACTIVE"] = "active";
    MemberStatus["INACTIVE"] = "inactive";
    MemberStatus["SUSPENDED"] = "suspended";
    MemberStatus["PENDING"] = "pending";
})(MemberStatus || (exports.MemberStatus = MemberStatus = {}));
var CheckInMethod;
(function (CheckInMethod) {
    CheckInMethod["QR"] = "qr";
    CheckInMethod["MANUAL"] = "manual";
    CheckInMethod["KIOSK"] = "kiosk";
    CheckInMethod["APP"] = "app";
})(CheckInMethod || (exports.CheckInMethod = CheckInMethod = {}));
var ActorType;
(function (ActorType) {
    ActorType["MEMBER"] = "member";
    ActorType["STAFF"] = "staff";
    ActorType["SYSTEM"] = "system";
    ActorType["SUPERADMIN"] = "superadmin";
})(ActorType || (exports.ActorType = ActorType = {}));
var StaffStatus;
(function (StaffStatus) {
    StaffStatus["ACTIVE"] = "active";
    StaffStatus["INACTIVE"] = "inactive";
    StaffStatus["INVITED"] = "invited";
})(StaffStatus || (exports.StaffStatus = StaffStatus = {}));
//# sourceMappingURL=auth.types.js.map