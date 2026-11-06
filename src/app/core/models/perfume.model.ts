export interface Size { ml: number; price: number }
export interface Perfume {
  id: number; slug: string; name: string; family: string; color: string;
  top: string[]; heart: string[]; base: string[];
  longevity: number; sillage: number; season: string; description: string; sizes: Size[];
  image?: string;   // اختياري: مسار صورة داخل public/images (مثلاً "images/rose-royale.webp")
}
