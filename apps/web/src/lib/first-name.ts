// The first name friends see ("[Name] shared a sunset with you"), set on Welcome and on You.
// Kept free of database code so the client and the tests can import it.
import { z } from "zod";

export const MAX_FIRST_NAME_LENGTH = 40;

// Control characters (newlines included) become spaces, so the name stays one line.
const oneLine = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

export const firstNameSchema = z
  .string()
  .transform(oneLine)
  .pipe(
    z
      .string()
      .min(1, "Please type your first name.")
      .max(MAX_FIRST_NAME_LENGTH, `Keep your name under ${MAX_FIRST_NAME_LENGTH} characters.`),
  );
