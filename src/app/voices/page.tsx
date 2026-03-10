import { query } from '@/lib/db';
import Link from 'next/link';

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
      <h1 className="text-lg font-bold text-white">Quizzes with Voice Features</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">TTS</th>
              <th className="px-3 py-2 text-right">Library</th>
              <th className="px-3 py-2 text-right">Record</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {voiceQuizzes.map((q: Record<string, unknown>) => (
              <tr key={q.id as number} className="hover:bg-gray-800/50">
                <td className="px-3 py-2">
                  <Link href={`/quizzes/${q.id}/peek`} className="text-blue-400 hover:underline">{q.id as number}</Link>
                </td>
                <td className="px-3 py-2">{q.name as string}</td>
                <td className="px-3 py-2 text-right font-bold">{q.total_voice_features as number}</td>
                <td className="px-3 py-2 text-right">{q.tts_count as number}</td>
                <td className="px-3 py-2 text-right">{q.library_count as number}</td>
                <td className="px-3 py-2 text-right">{q.record_count as number}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
