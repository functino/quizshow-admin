'use client';
import { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

interface VoiceEntry {
  src?: string;
  source?: string;
  text?: string;
}

interface Part {
  audio?: {
    voiceQuestion?: VoiceEntry;
    voiceAnswers?: VoiceEntry;
    voiceSolution?: VoiceEntry;
  };
}

interface Quiz {
  id: number;
  name: string;
  total_voice_features: number;
  tts_count: number;
  library_count: number;
  record_count: number;
  data: { parts: Part[] };
}

function VoiceItem({ label, voice }: { label: string; voice: VoiceEntry }) {
  if (!voice?.src) return null;
  return (
    <div className="bg-background rounded-md border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-primary">{label}</span>
        <Badge variant="outline" className="text-xs">{voice.source}</Badge>
      </div>
      <audio controls className="w-full max-w-md">
        <source src={voice.src} type="audio/mpeg" />
      </audio>
      {voice.text && <p className="text-xs text-muted-foreground italic">{voice.text}</p>}
    </div>
  );
}

export default function VoiceDetails({ quiz }: { quiz: Quiz }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setOpen(!open)}>
        <TableCell>
          <a href={`/quizzes/${quiz.id}/peek`} className="inline-flex items-center gap-1 text-primary hover:underline" onClick={e => e.stopPropagation()}>
            {quiz.id} <Eye className="w-3 h-3" />
          </a>
        </TableCell>
        <TableCell>{quiz.name}</TableCell>
        <TableCell className="text-right font-bold">{quiz.total_voice_features}</TableCell>
        <TableCell className="text-right">{quiz.tts_count}</TableCell>
        <TableCell className="text-right">{quiz.library_count}</TableCell>
        <TableCell className="text-right">{quiz.record_count}</TableCell>
        <TableCell className="text-center text-muted-foreground">{open ? '▲' : '▼'}</TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-4">
            <div className="space-y-4">
              {quiz.data.parts.map((part, i) => {
                const audio = part.audio;
                if (!audio) return null;
                const hasVoice = audio.voiceQuestion?.src || audio.voiceAnswers?.src || audio.voiceSolution?.src;
                if (!hasVoice) return null;
                return (
                  <div key={i} className="border-l-3 border-primary pl-4 space-y-2">
                    <div className="text-sm font-semibold">Part {i + 1}</div>
                    <VoiceItem label="Question" voice={audio.voiceQuestion!} />
                    <VoiceItem label="Answers" voice={audio.voiceAnswers!} />
                    <VoiceItem label="Solution" voice={audio.voiceSolution!} />
                  </div>
                );
              })}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
