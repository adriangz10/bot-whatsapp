"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDocsModule = void 0;
const common_1 = require("@nestjs/common");
const google_docs_service_1 = require("./google-docs.service");
const google_docs_controller_1 = require("./google-docs.controller");
let GoogleDocsModule = class GoogleDocsModule {
};
exports.GoogleDocsModule = GoogleDocsModule;
exports.GoogleDocsModule = GoogleDocsModule = __decorate([
    (0, common_1.Module)({
        providers: [google_docs_service_1.GoogleDocsService],
        controllers: [google_docs_controller_1.GoogleDocsController],
        exports: [google_docs_service_1.GoogleDocsService],
    })
], GoogleDocsModule);
//# sourceMappingURL=google-docs.module.js.map