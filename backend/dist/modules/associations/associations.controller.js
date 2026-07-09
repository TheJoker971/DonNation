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
exports.AssociationsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const client_1 = require("@prisma/client");
const associations_service_1 = require("./associations.service");
const receipt_service_1 = require("../documents/receipt.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let AssociationsController = class AssociationsController {
    associationsService;
    receiptService;
    constructor(associationsService, receiptService) {
        this.associationsService = associationsService;
        this.receiptService = receiptService;
    }
    findPublic() {
        return this.associationsService.findPublicCatalog();
    }
    me(user) {
        return this.associationsService.findMine(user.sub);
    }
    receivedDonations(user) {
        return this.associationsService.findReceivedDonations(user.sub);
    }
    async donationReceipt(user, id) {
        const pdfUrl = await this.receiptService.ensureReceiptForAssociation(user.sub, id);
        return { pdfUrl };
    }
    uploadLogo(user, file) {
        if (!file) {
            throw new common_1.BadRequestException('Logo file is required');
        }
        const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMime.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Logo must be JPG, PNG or WebP');
        }
        return this.associationsService.updateLogo(user.sub, file);
    }
    startStripeOnboarding(user) {
        return this.associationsService.startStripeOnboarding(user.sub);
    }
};
exports.AssociationsController = AssociationsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AssociationsController.prototype, "findPublic", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ASSOCIATION),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssociationsController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('me/donations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ASSOCIATION),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssociationsController.prototype, "receivedDonations", null);
__decorate([
    (0, common_1.Get)('me/donations/:id/receipt'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ASSOCIATION),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AssociationsController.prototype, "donationReceipt", null);
__decorate([
    (0, common_1.Post)('me/logo'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ASSOCIATION),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('logo', {
        limits: { fileSize: 2 * 1024 * 1024 },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AssociationsController.prototype, "uploadLogo", null);
__decorate([
    (0, common_1.Post)('me/stripe/onboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ASSOCIATION),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssociationsController.prototype, "startStripeOnboarding", null);
exports.AssociationsController = AssociationsController = __decorate([
    (0, common_1.Controller)('associations'),
    __metadata("design:paramtypes", [associations_service_1.AssociationsService,
        receipt_service_1.ReceiptService])
], AssociationsController);
//# sourceMappingURL=associations.controller.js.map