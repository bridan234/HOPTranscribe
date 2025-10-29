import { jsonrepair } from 'jsonrepair';
import { loggingService } from '../services/loggingService';

export function repairJson(malformedJson: string): string | null {
  try {
    const repaired = jsonrepair(malformedJson);
    return repaired;
  } catch (error) {
    loggingService.error('JSON repair failed', 'JSON Repair', error as Error, { malformedJson });
    return null;
  }
}
