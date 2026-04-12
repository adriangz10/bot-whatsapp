import { GoogleDocsService } from './google-docs.service';
export declare class GoogleDocsController {
    private readonly googleDocsService;
    constructor(googleDocsService: GoogleDocsService);
    reload(): Promise<{
        message: string;
        characters: number;
    }>;
}
