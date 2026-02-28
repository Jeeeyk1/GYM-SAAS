"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformRole = exports.AccountType = exports.StaffStatus = exports.ActorType = exports.CheckInMethod = exports.MemberStatus = exports.ClientPlan = exports.ClientStatus = void 0;
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
var AccountType;
(function (AccountType) {
    AccountType["PLATFORM_ADMIN"] = "PLATFORM_ADMIN";
    AccountType["GYM_USER"] = "gym_user";
})(AccountType || (exports.AccountType = AccountType = {}));
var PlatformRole;
(function (PlatformRole) {
    PlatformRole["SUPER_ADMIN"] = "super_admin";
    PlatformRole["PLATFORM_SUPPORT"] = "platform_support";
})(PlatformRole || (exports.PlatformRole = PlatformRole = {}));
