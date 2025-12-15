export type ResolutionStatus = 'UNRESOLVED' | 'AUTO_RESOLVED' | 'USER_CONFIRMED' | 'BARCODE_LINKED';

export interface CandidateOption {
  canonical_product_id: string;
  name_tr?: string;
  confidence_score?: number;
}

export interface LineItem {
  line_item_id: string;
  raw_text_original: string;
  detected_price?: number;
  resolution_status: ResolutionStatus;
  confidence_score?: number;
  candidate_options?: CandidateOption[];
  canonical_product_id?: string;
}

export interface ReceiptUploadResponse {
  receipt_id: string;
  status: string;
  needs_confirmation: boolean;
  items: LineItem[];
}

export interface StatsCategory {
  category: string;
  median_price?: number;
  sample_count?: number;
}

export interface PersonalStatsResponse {
  period_month?: string;
  personal_cpi_value?: number;
  sample_count?: number;
  categories?: StatsCategory[];
  warnings?: string[];
}

export interface PublicStatsResponse {
  period_month?: string;
  public_cpi_value?: number;
  sample_count?: number;
  categories?: StatsCategory[];
  warnings?: string[];
}
