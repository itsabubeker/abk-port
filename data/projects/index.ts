import { Project } from "@/types";
import { venasTechnologies } from "./venas-technologies";
import { timePlatform } from "./time-platform";
import { astrahOs } from "./astrah-os";
import { doxiverseAiForHealthcare } from "./doxiverse-ai-for-healthcare";
import { iqraNet } from "./iqra-net";
import { aiLeadEnrichmentPipeline } from "./lead-pipeline";
import { notebase } from "./notebase";

// Array order controls display order.
export const projects: Project[] = [
  venasTechnologies,
  timePlatform,
  aiLeadEnrichmentPipeline,
  notebase,
  astrahOs,
  doxiverseAiForHealthcare,
  iqraNet,
];
