"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAssociationsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const associations_service_1 = require("./associations.service");
const list_associations_query_dto_1 = require("./dto/list-associations-query.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let AdminAssociationsController = class AdminAssociationsController {
    associationsService;
    constructor(associationsService) {
        this.associationsService = associationsService;
    }
    list(query) {
        return this.associationsService.findAllForAdmin(query.status);
    }
    approve(id, admin) {
        return this.associationsService.approve(id, admin.sub);
    }
    suspend(id, admin) {
        return this.associationsService.suspend(id, admin.sub);
    }
};
exports.AdminAssociationsController = AdminAssociationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_associations_query_dto_1.ListAssociationsQueryDto]),
    __metadata("design:returntype", void 0)
], AdminAssociationsController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminAssociationsController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/suspend'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminAssociationsController.prototype, "suspend", null);
exports.AdminAssociationsController = AdminAssociationsController = __decorate([
    (0, common_1.Controller)('admin/associations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:paramtypes", [associations_service_1.AssociationsService])
], AdminAssociationsController);
//# sourceMappingURL=admin-associations.controller.js.map