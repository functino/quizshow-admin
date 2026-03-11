import { query } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody } from '@/components/ui/table';
import VoiceDetails from './VoiceDetails';

export const dynamic = 'force-dynamic';

export default async function VoicesPage() {
  const voiceQuizzes = await query(`
    SELECT id, name, data,
           (tts_count + library_count + record_count) as total_voice_features,
           tts_count, library_count, record_count
    FROM (
      SELECT id, name, data, updated_at,
        SUM(CASE WHEN jsonb_extract_path_text(part, 'audio', 'voiceQuestion', 'source') = 'tts'
                 OR jsonb_extract_path_text(part, 'audio', 'voiceAnswers', 'source') = 'tts'
                 OR jsonb_extract_path_text(part, 'audio', 'voiceSolution', 'source') = 'tts'
            THEN 1 ELSE 0 END) as tts_count,
        SUM(CASE WHEN jsonb_extract_path_text(part, 'audio', 'voiceQuestion', 'source') = 'library'
                 OR jsonb_extract_path_text(part, 'audio', 'voiceAnswers', 'source') = 'library'
                 OR jsonb_extract_path_text(part, 'audio', 'voiceSolution', 'source') = 'library'
            THEN 1 ELSE 0 END) as library_count,
        SUM(CASE WHEN jsonb_extract_path_text(part, 'audio', 'voiceQuestion', 'source') = 'record'
                 OR jsonb_extract_path_text(part, 'audio', 'voiceAnswers', 'source') = 'record'
                 OR jsonb_extract_path_text(part, 'audio', 'voiceSolution', 'source') = 'record'
            THEN 1 ELSE 0 END) as record_count
      FROM quizzes, jsonb_array_elements(data->'parts') AS part
      WHERE jsonb_extract_path_text(part, 'audio', 'voiceQuestion') IS NOT NULL
         OR jsonb_extract_path_text(part, 'audio', 'voiceAnswers') IS NOT NULL
         OR jsonb_extract_path_text(part, 'audio', 'voiceSolution') IS NOT NULL
      GROUP BY id, name, data
    ) as quiz_counts
    WHERE (tts_count + library_count + record_count) > 0
    ORDER BY updated_at DESC
  `);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Quizzes with Voice Features</h1>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">TTS</TableHead>
                <TableHead className="text-right">Library</TableHead>
                <TableHead className="text-right">Record</TableHead>
                <TableHead className="text-center w-12"></TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {voiceQuizzes.map((q: Record<string, unknown>) => (
                <VoiceDetails
                  key={q.id as number}
                  quiz={{
                    id: q.id as number,
                    name: q.name as string,
                    total_voice_features: Number(q.total_voice_features),
                    tts_count: Number(q.tts_count),
                    library_count: Number(q.library_count),
                    record_count: Number(q.record_count),
                    data: q.data as { parts: { audio?: { voiceQuestion?: { src?: string; source?: string; text?: string }; voiceAnswers?: { src?: string; source?: string; text?: string }; voiceSolution?: { src?: string; source?: string; text?: string } } }[] },
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
