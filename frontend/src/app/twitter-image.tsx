// Twitter использует тот же layout что и Open Graph.
// Re-export чтобы не дублировать код.
export {
  default,
  generateImageMetadata,
  size,
  contentType,
} from "./opengraph-image";
