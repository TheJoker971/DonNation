"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssociationsModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const associations_service_1 = require("./associations.service");
const associations_controller_1 = require("./associations.controller");
const admin_associations_controller_1 = require("./admin-associations.controller");
const payments_module_1 = require("../payments/payments.module");
const blockchain_module_1 = require("../blockchain/blockchain.module");
const documents_module_1 = require("../documents/documents.module");
let AssociationsModule = class AssociationsModule {
};
exports.AssociationsModule = AssociationsModule;
exports.AssociationsModule = AssociationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            payments_module_1.PaymentsModule,
            blockchain_module_1.BlockchainModule,
            documents_module_1.DocumentsModule,
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.getOrThrow('JWT_SECRET'),
                    signOptions: {
                        expiresIn: config.get('JWT_EXPIRES_IN', '1h'),
                    },
                }),
            }),
        ],
        controllers: [associations_controller_1.AssociationsController, admin_associations_controller_1.AdminAssociationsController],
        providers: [associations_service_1.AssociationsService],
        exports: [associations_service_1.AssociationsService],
    })
], AssociationsModule);
//# sourceMappingURL=associations.module.js.map