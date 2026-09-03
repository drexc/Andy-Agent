import type { PathLike } from "fs";
import type * as fs from "fs/promises";

// Make a path take a unix-like form.  Useful for making path comparisons.
export function toPosix(filePath: PathLike | fs.FileHandle) {
	return filePath.toString().toPosix();
}
