import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Common Zod schemas for application entities
 */
export const Schemas = {
  // Database IDs (Prisma typically uses strings/cuid/uuid or integers)
  id: z.string().min(1, "ID is required"),
  
  // Bangladesh Phone Number (11 digits)
  phone: z.string().regex(/^01[3-9]\d{8}$/, "Invalid Bangladesh phone number"),
  
  // Date strings from forms
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),

  // Sanitization helper
  text: (min = 1) => z.string().trim().min(min).transform(val => 
    val.replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;")
  ),
};

/**
 * Helper to validate request body or search params
 */
export async function validateRequest<T>(
  schema: z.Schema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { 
          error: "Validation failed", 
          details: result.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      )
    };
  }

  return { success: true, data: result.data };
}
