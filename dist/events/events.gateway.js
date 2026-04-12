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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const ws_1 = require("ws");
const events_service_1 = require("./events.service");
let EventsGateway = class EventsGateway {
    eventsService;
    server;
    logger = new common_1.Logger('EventsGateway');
    constructor(eventsService) {
        this.eventsService = eventsService;
    }
    afterInit(server) {
        this.eventsService.setServer(server);
        this.logger.log('WebSocket server initialized');
    }
    handleConnection(client) {
        this.logger.log('Client connected');
    }
    handleDisconnect(client) {
        this.logger.log('Client disconnected');
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", ws_1.Server)
], EventsGateway.prototype, "server", void 0);
exports.EventsGateway = EventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)(),
    __metadata("design:paramtypes", [events_service_1.EventsService])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map