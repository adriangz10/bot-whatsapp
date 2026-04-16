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
var GoogleDocsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDocsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const rag_service_1 = require("../rag/rag.service");
let GoogleDocsService = GoogleDocsService_1 = class GoogleDocsService {
    configService;
    ragService;
    logger = new common_1.Logger(GoogleDocsService_1.name);
    documentContent = '';
    priceEntries = [];
    documentId;
    docsClient = null;
    constructor(configService, ragService) {
        this.configService = configService;
        this.ragService = ragService;
        this.documentId = this.configService.get('GOOGLE_DOCS_DOCUMENT_ID') || '';
    }
    async onModuleInit() {
        await this.initializeClient();
        if (this.docsClient) {
            await this.loadDocument();
        }
    }
    async initializeClient() {
        if (!this.documentId) {
            this.logger.warn('GOOGLE_DOCS_DOCUMENT_ID not configured. Context will be empty.');
            return;
        }
        const credentials = this.getCredentials();
        if (!credentials) {
            this.logger.warn('Google credentials not configured. Set GOOGLE_CREDENTIALS env var.');
            return;
        }
        try {
            const { google } = await import('googleapis');
            const auth = new google.auth.JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: ['https://www.googleapis.com/auth/documents.readonly'],
            });
            this.docsClient = google.docs({ version: 'v1', auth });
        }
        catch (error) {
            this.logger.error('Failed to initialize Google Docs client:', error);
        }
    }
    getCredentials() {
        const credentialsJson = this.configService.get('GOOGLE_CREDENTIALS');
        if (!credentialsJson) {
            this.logger.warn('GOOGLE_CREDENTIALS not configured.');
            return null;
        }
        try {
            const credentials = JSON.parse(credentialsJson);
            return {
                client_email: credentials.client_email,
                private_key: credentials.private_key.replace(/\\n/g, '\n'),
            };
        }
        catch (error) {
            this.logger.error('Failed to parse GOOGLE_CREDENTIALS:', error);
            return null;
        }
    }
    async loadDocument() {
        if (!this.docsClient || !this.documentId) {
            return;
        }
        try {
            const response = await this.docsClient.documents.get({ documentId: this.documentId });
            this.documentContent = this.extractText(response.data);
            this.priceEntries = this.parsePriceEntries(this.documentContent);
            this.logger.log(`Document loaded: ${this.documentContent.length} characters`);
            this.logger.log(`Parsed ${this.priceEntries.length} price entries from Google Doc`);
            await this.ragService.indexDocument(this.documentContent, 'google-docs');
        }
        catch (error) {
            this.logger.error('Failed to load Google Doc:', error?.message || error);
        }
    }
    extractText(document) {
        const content = document.body?.content || [];
        let text = '';
        for (const element of content) {
            if (element.paragraph) {
                for (const textElement of element.paragraph.elements || []) {
                    if (textElement.textRun?.content) {
                        text += textElement.textRun.content;
                    }
                }
                text += '\n';
            }
        }
        return text.trim();
    }
    getContext() {
        return this.documentContent;
    }
    findPriceAnswer(userMessage) {
        const normalizedMessage = this.normalizeText(userMessage);
        if (!this.looksLikePriceQuestion(normalizedMessage)) {
            return null;
        }
        const bestMatch = this.findBestPriceMatch(normalizedMessage);
        if (!bestMatch) {
            return null;
        }
        const scope = this.detectEquipmentScope(normalizedMessage);
        if (scope === 'single' && bestMatch.prices.length >= 2) {
            const singlePrice = this.detectSinglePrice(normalizedMessage, bestMatch);
            if (singlePrice) {
                return `El precio de ${bestMatch.service} es ${singlePrice}.`;
            }
        }
        if (bestMatch.prices.length === 1) {
            return `El precio de ${bestMatch.service} es ${bestMatch.prices[0]}.`;
        }
        if (bestMatch.prices.length >= 2) {
            const labeledPrices = this.formatLabeledPrices(bestMatch);
            return `El precio de ${bestMatch.service} es ${labeledPrices}.`;
        }
        return null;
    }
    async reload() {
        await this.loadDocument();
    }
    parsePriceEntries(text) {
        const entries = [];
        const lines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        for (const line of lines) {
            const prices = line.match(/\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g);
            if (!prices || prices.length === 0) {
                continue;
            }
            const service = line.replace(/\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g, ' ').replace(/\s{2,}/g, ' ').trim();
            if (!service) {
                continue;
            }
            entries.push({
                service,
                normalizedService: this.normalizeText(service),
                prices: prices.map((price) => price.replace(/\s+/g, ' ').trim()),
                labels: this.inferPriceLabels(line, prices.length),
            });
        }
        return entries;
    }
    normalizeText(text) {
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    looksLikePriceQuestion(normalizedMessage) {
        const triggers = [
            'precio',
            'precios',
            'cuanto sale',
            'cuanto cuesta',
            'cuesta',
            'sale',
            'valor',
            'cotizacion',
            'presupuesto',
        ];
        return triggers.some((trigger) => normalizedMessage.includes(trigger));
    }
    findBestPriceMatch(normalizedMessage) {
        let bestMatch = null;
        let bestScore = 0;
        for (const entry of this.priceEntries) {
            const score = this.scorePriceEntry(normalizedMessage, entry.normalizedService);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = entry;
            }
        }
        return bestScore >= 2 ? bestMatch : null;
    }
    scorePriceEntry(normalizedMessage, normalizedService) {
        const messageTokens = new Set(normalizedMessage.split(' ').filter((token) => token.length > 2));
        const serviceTokens = normalizedService.split(' ').filter((token) => token.length > 2);
        let score = 0;
        for (const token of serviceTokens) {
            if (messageTokens.has(token)) {
                score += 1;
            }
        }
        const synonyms = [
            { terms: ['mantenimiento general', 'limpieza interna', 'pasta termica'], bonus: 3 },
            { terms: ['formateo', 'instalacion windows'], bonus: 2 },
            { terms: ['backup', 'respaldo'], bonus: 2 },
            { terms: ['virus', 'optimizacion'], bonus: 2 },
            { terms: ['clonado', 'clonar disco'], bonus: 2 },
            { terms: ['hardware', 'ram', 'ssd'], bonus: 2 },
            { terms: ['diagnostico', 'revision'], bonus: 2 },
            { terms: ['domicilio'], bonus: 2 },
            { terms: ['remoto'], bonus: 2 },
        ];
        for (const synonym of synonyms) {
            const messageHasSynonym = synonym.terms.some((term) => normalizedMessage.includes(term));
            const serviceHasSynonym = synonym.terms.some((term) => normalizedService.includes(term));
            if (messageHasSynonym && serviceHasSynonym) {
                score += synonym.bonus;
            }
        }
        return score;
    }
    detectEquipmentScope(normalizedMessage) {
        if (normalizedMessage.includes('notebook') ||
            normalizedMessage.includes('laptop') ||
            normalizedMessage.includes('portatil')) {
            return 'single';
        }
        if (normalizedMessage.includes('pc') ||
            normalizedMessage.includes('computadora') ||
            normalizedMessage.includes('escritorio')) {
            return 'single';
        }
        return 'both';
    }
    detectSinglePrice(normalizedMessage, entry) {
        if (entry.prices.length === 0) {
            return null;
        }
        if (normalizedMessage.includes('notebook') ||
            normalizedMessage.includes('laptop') ||
            normalizedMessage.includes('portatil')) {
            return this.getPriceByPreferredLabels(entry, ['notebook', 'laptop', 'portatil']) || entry.prices[1] || entry.prices[0];
        }
        if (normalizedMessage.includes('pc') ||
            normalizedMessage.includes('computadora') ||
            normalizedMessage.includes('escritorio')) {
            return this.getPriceByPreferredLabels(entry, ['pc', 'computadora', 'escritorio']) || entry.prices[0];
        }
        return null;
    }
    inferPriceLabels(line, priceCount) {
        const explicitLabels = [];
        const fragments = line
            .split('|')
            .map((fragment) => fragment.trim())
            .filter(Boolean);
        for (const fragment of fragments) {
            if (!fragment.includes('$')) {
                continue;
            }
            const normalizedFragment = this.normalizeText(fragment);
            if (normalizedFragment.includes('notebook') || normalizedFragment.includes('laptop') || normalizedFragment.includes('portatil')) {
                explicitLabels.push('notebook');
                continue;
            }
            if (normalizedFragment.includes('pc') || normalizedFragment.includes('computadora') || normalizedFragment.includes('escritorio')) {
                explicitLabels.push('pc');
                continue;
            }
            explicitLabels.push(`precio ${explicitLabels.length + 1}`);
        }
        if (explicitLabels.length === priceCount) {
            return explicitLabels;
        }
        if (priceCount === 2) {
            return ['pc', 'notebook'];
        }
        return Array.from({ length: priceCount }, (_, index) => `precio ${index + 1}`);
    }
    getPriceByPreferredLabels(entry, preferredLabels) {
        const labelIndex = entry.labels.findIndex((label) => preferredLabels.some((preferredLabel) => label.includes(preferredLabel)));
        if (labelIndex === -1) {
            return null;
        }
        return entry.prices[labelIndex] || null;
    }
    formatLabeledPrices(entry) {
        return entry.prices
            .map((price, index) => `${price} para ${this.humanizePriceLabel(entry.labels[index] || `precio ${index + 1}`)}`)
            .join(' y ');
    }
    humanizePriceLabel(label) {
        if (label === 'pc') {
            return 'PC de escritorio';
        }
        if (label === 'notebook') {
            return 'notebook';
        }
        return label;
    }
};
exports.GoogleDocsService = GoogleDocsService;
exports.GoogleDocsService = GoogleDocsService = GoogleDocsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        rag_service_1.RagService])
], GoogleDocsService);
//# sourceMappingURL=google-docs.service.js.map