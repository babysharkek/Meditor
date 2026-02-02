export interface FilmstripFrame {
	mediaId: string;
	timestamp: number;
	tier: number;
	dataUrl: string;
}

export interface FilmstripRequest {
	mediaId: string;
	file: File;
	timestamps: number[];
}

export type FilmstripStatus = "idle" | "generating" | "ready" | "error";

export interface FilmstripGenerationProgress {
	mediaId: string;
	timestamp: number;
	dataUrl: string;
}

export interface FilmstripGenerationComplete {
	mediaId: string;
	timestamps: number[];
}
