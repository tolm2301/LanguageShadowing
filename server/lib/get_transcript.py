import sys
import os
import json

# Ensure user site-packages are accessible on Linux / Render
candidates = [
    '/opt/render/.local/lib/python3.11/site-packages',
    '/opt/render/.local/lib/python3.10/site-packages',
    '/opt/render/.local/lib/python3.12/site-packages',
    os.path.expanduser('~/.local/lib/python3.11/site-packages'),
    os.path.expanduser('~/.local/lib/python3.10/site-packages'),
    os.path.expanduser('~/.local/lib/python3.12/site-packages'),
]
for p in candidates:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

def get_transcript(video_id, languages=None):
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError as e:
        return {'success': False, 'error': f'ImportError: {str(e)}'}

    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)
        
        tracks = []
        for t in transcript_list:
            tracks.append({
                'language': t.language,
                'language_code': t.language_code,
                'is_generated': t.is_generated
            })

        # If specific languages requested
        if languages:
            target_langs = [l.strip() for l in languages.split(',') if l.strip()]
        else:
            target_langs = ['en']

        try:
            transcript_obj = transcript_list.find_transcript(target_langs)
        except Exception:
            # Fallback to the first available transcript
            transcripts = list(transcript_list)
            if transcripts:
                transcript_obj = transcripts[0]
            else:
                return {'success': False, 'error': 'No transcripts found', 'tracks': []}

        items = transcript_obj.fetch()
        formatted = []
        for i, item in enumerate(items):
            if isinstance(item, dict):
                start = float(item.get('start', 0.0))
                dur = float(item.get('duration', 0.0))
                text = str(item.get('text', ''))
            else:
                start = float(getattr(item, 'start', 0.0))
                dur = float(getattr(item, 'duration', 0.0))
                text = str(getattr(item, 'text', ''))

            formatted.append({
                'id': i,
                'start': round(start, 2),
                'duration': round(dur, 2),
                'end': round(start + dur, 2),
                'text': text.replace('\n', ' ').strip()
            })

        return {
            'success': True,
            'tracks': tracks,
            'selectedTrack': {
                'language': transcript_obj.language,
                'language_code': transcript_obj.language_code,
                'is_generated': transcript_obj.is_generated
            },
            'transcript': formatted
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Missing video_id'}))
        sys.exit(1)

    vid = sys.argv[1]
    langs = sys.argv[2] if len(sys.argv) > 2 else 'en'
    res = get_transcript(vid, langs)
    print(json.dumps(res, ensure_ascii=False))
