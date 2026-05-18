import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Square, 
  Volume2, 
  Download, 
  Settings2, 
  RotateCcw,
  Mic2,
  Trash2,
  ChevronDown,
  Activity,
  Copy,
  Info,
  Layers,
  Database,
  History,
  UserPlus,
  Filter,
  Check,
  Search,
  X,
  User,
  Clock,
  Save,
  Plus,
  Globe,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Power,
  Edit2,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedAudio, ClonedVoice, VoiceCategory, AgeFilter, GenderFilter, VoiceConfig } from './types';

export default function App() {
  const [text, setText] = useState('Hola, bienvenido a VoxSynth Pro. Esta es una demostración de la síntesis de voz premium funcionando completamente sin conexión a internet. Puedes ajustar mi velocidad y tono en tiempo real para obtener el resultado perfecto para tu audiolibro o podcast.');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New States
  const [activeTab, setActiveTab] = useState<'editor' | 'library' | 'cloning' | 'management'>('editor');
  const [savedAudios, setSavedAudios] = useState<SavedAudio[]>([]);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [voiceConfigs, setVoiceConfigs] = useState<VoiceConfig[]>([]);
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [editingVoiceId, setEditingVoiceId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [isCloningModalOpen, setIsCloningModalOpen] = useState(false);
  const [cloningStep, setCloningStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [newVoiceMeta, setNewVoiceMeta] = useState<Partial<ClonedVoice>>({
    gender: 'male',
    age: 'young-adult',
    lang: 'es-ES'
  });

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Persistence
  useEffect(() => {
    const storedHistory = localStorage.getItem('voxsynth_history');
    if (storedHistory) setSavedAudios(JSON.parse(storedHistory));

    const storedClones = localStorage.getItem('voxsynth_clones');
    if (storedClones) setClonedVoices(JSON.parse(storedClones));

    const storedConfigs = localStorage.getItem('voxsynth_voice_configs');
    if (storedConfigs) setVoiceConfigs(JSON.parse(storedConfigs));
  }, []);

  useEffect(() => {
    localStorage.setItem('voxsynth_voice_configs', JSON.stringify(voiceConfigs));
  }, [voiceConfigs]);

  const getVoiceConfig = (id: string) => {
    return voiceConfigs.find(c => c.id === id) || { id, isDisabled: false, isHidden: false };
  };

  const toggleVoiceConfig = (id: string, key: 'isDisabled' | 'isHidden') => {
    setVoiceConfigs(prev => {
      const existing = prev.find(c => c.id === id);
      if (existing) {
        return prev.map(c => c.id === id ? { ...c, [key]: !c[key] } : c);
      }
      return [...prev, { id, isDisabled: key === 'isDisabled', isHidden: key === 'isHidden', customName: '' }];
    });
  };

  const updateVoiceName = (id: string, newName: string) => {
    setVoiceConfigs(prev => {
      const existing = prev.find(c => c.id === id);
      if (existing) {
        return prev.map(c => c.id === id ? { ...c, customName: newName } : c);
      }
      return [...prev, { id, customName: newName, isDisabled: false, isHidden: false }];
    });
    setEditingVoiceId(null);
  };

  const deleteVoice = (id: string) => {
    if (clonedVoices.find(v => v.name === id)) {
      const updated = clonedVoices.filter(v => v.name !== id);
      setClonedVoices(updated);
      localStorage.setItem('voxsynth_clones', JSON.stringify(updated));
    }
    // Also cleanup config
    setVoiceConfigs(prev => prev.filter(c => c.id !== id));
  };

  const saveToHistory = () => {
    if (!text || !selectedVoice) return;
    const newAudio: SavedAudio = {
      id: crypto.randomUUID(),
      text,
      voiceName: selectedVoice,
      lang: voices.find(v => v.name === selectedVoice)?.lang || 'unknown',
      pitch,
      rate,
      timestamp: Date.now()
    };
    const updated = [newAudio, ...savedAudios];
    setSavedAudios(updated);
    localStorage.setItem('voxsynth_history', JSON.stringify(updated));
  };

  const deleteFromHistory = (id: string) => {
    const updated = savedAudios.filter(a => a.id !== id);
    setSavedAudios(updated);
    localStorage.setItem('voxsynth_history', JSON.stringify(updated));
  };

  const handleCloneVoice = () => {
    const newClone: ClonedVoice = {
      id: crypto.randomUUID(),
      name: newVoiceMeta.name || `Clone ${clonedVoices.length + 1}`,
      lang: newVoiceMeta.lang || 'es-ES',
      gender: newVoiceMeta.gender || 'male',
      age: newVoiceMeta.age || 'adult',
      isCloned: true
    };
    const updated = [...clonedVoices, newClone];
    setClonedVoices(updated);
    localStorage.setItem('voxsynth_clones', JSON.stringify(updated));
    setIsCloningModalOpen(false);
    setCloningStep(1);
    setSelectedVoice(newClone.name);
  };

  // Simplified gender/age detection for standard voices
  const getVoiceMeta = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    const isFemale = name.includes('female') || name.includes('google  español') || name.includes('helena') || name.includes('laura');
    const isChild = name.includes('child') || name.includes('kid');
    return {
      gender: (isFemale ? 'female' : 'male') as GenderFilter,
      age: (isChild ? 'child' : 'adult') as AgeFilter,
      isOnline: !v.localService
    };
  };

  const cloudVoices = [
    { name: 'Cloud Premium Male', lang: 'es-ES', gender: 'male', age: 'adult', isCloned: false, isCloud: true },
    { name: 'Cloud Premium Female', lang: 'es-ES', gender: 'female', age: 'adult', isCloned: false, isCloud: true },
    { name: 'Cloud Soft Narrative', lang: 'es-ES', gender: 'female', age: 'young-adult', isCloned: false, isCloud: true },
    { name: 'Cloud Deep Voice', lang: 'es-ES', gender: 'male', age: 'senior', isCloned: false, isCloud: true },
  ];

  // Improved filtering logic
  const filteredVoices = [
    ...voices.map(v => {
      const config = getVoiceConfig(v.name);
      return {
        name: v.name,
        displayName: config.customName || v.name.split(' (')[0],
        lang: v.lang,
        isCloned: false,
        isCloud: false,
        ...getVoiceMeta(v),
        ...config
      };
    }),
    ...clonedVoices.map(cv => {
      const config = getVoiceConfig(cv.name);
      return { 
        ...cv, 
        displayName: config.customName || cv.name,
        isCloud: false, 
        ...config 
      };
    }),
    ...cloudVoices.map(cv => {
      const config = getVoiceConfig(cv.name);
      return { 
        ...cv, 
        displayName: config.customName || cv.name,
        isCloud: true, 
        ...config 
      };
    })
  ].filter(v => {
    if (v.isHidden && !isManagementMode && activeTab !== 'management') return false;
    
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.lang.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAge = ageFilter === 'all' || v.age === ageFilter;
    const matchesGender = genderFilter === 'all' || v.gender === genderFilter;
    return matchesSearch && matchesAge && matchesGender;
  });

  useEffect(() => {
    const loadVoices = () => {
      if (!synth) return;
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        const spanishVoice = availableVoices.find(v => v.lang.startsWith('es'));
        setSelectedVoice(spanishVoice?.name || availableVoices[0].name);
      }
    };

    loadVoices();
    if (synth && 'onvoiceschanged' in synth) {
      synth.onvoiceschanged = loadVoices;
    }
  }, [synth, selectedVoice]);

  const handleSpeak = useCallback(async () => {
    if (!text || !selectedVoice) return;

    const selectedVoiceData = filteredVoices.find(v => v.name === selectedVoice);
    if (selectedVoiceData?.isDisabled) {
      alert("Esta voz está deshabilitada. Actívala en el registro para usarla.");
      return;
    }
    if (selectedVoiceData?.isCloud) {
       if (isSpeaking) {
         audioRef.current?.pause();
         setIsSpeaking(false);
         return;
       }

       setIsOnlineLoading(true);
       try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text, 
              lang: selectedVoiceData.lang.split('-')[0],
              slow: rate < 0.8
            })
          });
          const data = await response.json();
          if (data.url) {
             if (!audioRef.current) audioRef.current = new Audio();
             audioRef.current.src = data.url;
             audioRef.current.onplay = () => {
               setIsSpeaking(true);
               setIsOnlineLoading(false);
             };
             audioRef.current.onended = () => setIsSpeaking(false);
             audioRef.current.play();
          }
       } catch (err) {
          console.error("Cloud TTS Error:", err);
          setIsOnlineLoading(false);
       }
       return;
    }

    // Native Synthesis Logic
    if (!synth) return;
    if (isSpeaking) {
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.pitch = pitch;
    utterance.rate = rate;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  }, [synth, text, selectedVoice, voices, pitch, rate, isSpeaking, filteredVoices]);

  const handleStop = useCallback(() => {
    if (synth) synth.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, [synth]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const handleDownload = async () => {
    const selectedVoiceData = filteredVoices.find(v => v.name === selectedVoice);
    
    if (selectedVoiceData?.isCloud) {
      setIsOnlineLoading(true);
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text, 
            lang: selectedVoiceData.lang.split('-')[0],
            slow: rate < 0.8
          })
        });
        const data = await response.json();
        if (data.url) {
          // Trigger download via proxy to get a real file named correctly
          window.location.href = `/api/download-proxy?url=${encodeURIComponent(data.url)}`;
        }
      } catch (err) {
        console.error("Download error:", err);
      } finally {
        setIsOnlineLoading(false);
      }
      return;
    }

    const message = "⚠️ Native Browser Voice:\n\n" +
      "Las voces del sistema local no se pueden exportar directamente a MP3 en el navegador por restricciones de seguridad.\n\n" +
      "¡USA LAS NUEVAS 'CLOUD VOICES' (Premium) para exportar tus audios directamente!";
    alert(message);
  };

  const handleReset = () => {
    setPitch(1);
    setRate(1);
    setText('');
    setSearchTerm('');
    handleStop();
  };

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 px-2 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Mic2 size={26} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none uppercase">
              VoxSynth <span className="text-emerald-500">Pro</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-1">
              Offline Speech Engine v4.2
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500/30'}`} />
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-tight">
              Status: {isSpeaking ? 'Synthesizing...' : 'Offline Ready'}
            </span>
          </div>
          
          <div className="hidden lg:flex flex-col items-end border-l border-zinc-800 pl-6">
            <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Hardware Usage</span>
            <span className="text-xs font-mono text-zinc-300">3.82 GB / 12.0 GB</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Voice Gallery Sidebar */}
        <aside className="w-80 bg-zinc-900/40 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden hidden md:flex shrink-0">
          <div className="p-5 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Database size={12} className="text-emerald-500" />
                Registry
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsManagementMode(!isManagementMode)}
                  className={`p-1.5 rounded-md border transition-all ${isManagementMode ? 'bg-emerald-500 border-emerald-400 text-zinc-950' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
                  title="Configurar Voces"
                >
                  <Settings2 size={12} />
                </button>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 rounded-md border border-zinc-700">
                   <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,1)]" />
                   <span className="text-[9px] font-bold text-zinc-400">CLOUD ACTIVE</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input 
                  type="text" 
                  placeholder="Voice / Language..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <select 
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as GenderFilter)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] font-bold text-zinc-400 focus:outline-none"
                  >
                    <option value="all">ANY GENDER</option>
                    <option value="male">MALE</option>
                    <option value="female">FEMALE</option>
                  </select>
                </div>
                <div className="flex-1">
                  <select 
                    value={ageFilter}
                    onChange={(e) => setAgeFilter(e.target.value as AgeFilter)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] font-bold text-zinc-400 focus:outline-none"
                  >
                    <option value="all">ANY AGE</option>
                    <option value="child">CHILD</option>
                    <option value="teen">TEEN</option>
                    <option value="young-adult">Y-ADULT</option>
                    <option value="adult">ADULT</option>
                    <option value="senior">SENIOR</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {filteredVoices.map((voice) => (
              <div 
                key={voice.name}
                onClick={() => setSelectedVoice(voice.name)}
                className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300 border group ${
                  selectedVoice === voice.name 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-transparent border-transparent hover:bg-zinc-800/40 hover:border-zinc-800'
                } ${voice.isDisabled ? 'opacity-40 grayscale' : ''}`}
              >
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold truncate ${selectedVoice === voice.name ? 'text-emerald-400' : 'text-zinc-200'}`}>
                      {voice.displayName}
                    </span>
                    {voice.isCloned && (
                      <span className="text-[8px] bg-emerald-500 text-zinc-950 px-1 rounded font-black tracking-tighter shrink-0">CLONE</span>
                    )}
                    {voice.isCloud && (
                      <span className="text-[8px] bg-blue-500 text-white px-1 rounded font-black tracking-tighter flex items-center gap-1 shrink-0">
                        <Globe size={8} /> CLOUD
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-zinc-500 font-mono uppercase truncate">
                      {voice.lang} • {voice.gender}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isManagementMode && (
                    <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleVoiceConfig(voice.name, 'isDisabled'); }}
                        className={`p-1 rounded-md transition-colors ${voice.isDisabled ? 'text-red-500 bg-red-500/10' : 'text-zinc-600 hover:text-emerald-400'}`}
                      >
                        <Power size={10} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleVoiceConfig(voice.name, 'isHidden'); }}
                        className={`p-1 rounded-md transition-colors ${voice.isHidden ? 'text-zinc-400 bg-zinc-100/10' : 'text-zinc-600 hover:text-blue-400'}`}
                      >
                        {voice.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                      </button>
                    </div>
                  )}
                  {selectedVoice === voice.name && !isManagementMode && (
                    <div className="bg-emerald-500 p-1 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                      <Check size={10} className="text-zinc-950" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredVoices.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 opacity-20">
                <Database size={32} />
                <span className="text-xs mt-2 font-black">NO RESULTS</span>
              </div>
            )}
          </div>
        </aside>

        {/* Text Engine Console / Tabs */}
        <section className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl w-fit shrink-0">
              <button 
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'editor' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Master Console
              </button>
              <button 
                onClick={() => setActiveTab('library')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'library' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <History size={12} /> Buffer History
              </button>
              <button 
                onClick={() => setActiveTab('management')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'management' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Settings2 size={12} /> Voice Management
              </button>
            <button 
                onClick={() => setIsCloningModalOpen(true)}
                className="ml-auto text-[10px] bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 px-4 py-2 rounded-xl border border-emerald-500/20 transition-all font-bold flex items-center gap-2"
              >
                <Plus size={12} /> CLONE VOICE
              </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'editor' ? (
              <motion.div 
                key="editor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col gap-6"
              >
                {/* Main Input */}
                <div className="flex-1 bg-zinc-900/20 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden relative">
                  <div className="px-5 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Neural Input Buffer</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleCopy}
                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[9px] font-bold text-zinc-300 transition-colors flex items-center gap-1"
                      >
                        <Copy size={10} /> CLIPBOARD
                      </button>
                      <button 
                        onClick={() => setText('')}
                        className="px-2 py-1 bg-zinc-800/50 hover:bg-zinc-800 rounded text-[9px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        CLEAR
                      </button>
                    </div>
                  </div>
                  <textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 bg-transparent p-6 text-lg md:text-xl leading-relaxed focus:outline-none resize-none placeholder-zinc-800 selection:bg-emerald-500/20 scrollbar-hide font-medium"
                    placeholder="Inject text data..."
                    spellCheck="false"
                  />
                  {/* Stats Overlay */}
                  <div className="absolute bottom-4 right-6 flex gap-4 text-[10px] font-mono text-zinc-600">
                     <span className="flex items-center gap-1"><Layers size={10} /> WORDS: {text.split(/\s+/).filter(Boolean).length}</span>
                     <span className="flex items-center gap-1"><Activity size={10} /> CHARS: {text.length}</span>
                  </div>
                </div>

                {/* Modulation Grid */}
                <div className="h-48 grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
                  {/* Matrix Controls */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between shadow-2xl relative">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                      <Settings2 size={12} className="text-emerald-500" />
                      Spectral Modulation
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter">Velocity</label>
                          <span className="text-[11px] font-mono text-emerald-400 font-black">{rate.toFixed(1)}x</span>
                        </div>
                        <input 
                          type="range" min="0.5" max="2.5" step="0.05" value={rate} 
                          onChange={(e) => setRate(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter">Pitch</label>
                          <span className="text-[11px] font-mono text-emerald-400 font-black">{pitch.toFixed(1)}x</span>
                        </div>
                        <input 
                          type="range" min="0.1" max="2.0" step="0.05" value={pitch} 
                          onChange={(e) => setPitch(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Signal Analysis */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col shadow-2xl overflow-hidden relative group">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Activity size={12} className="text-emerald-500" />
                          Spectral Analysis
                        </h3>
                        <button 
                          onClick={saveToHistory}
                          className="text-[9px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-2 py-1 rounded-md transition-all flex items-center gap-1 border border-zinc-700"
                        >
                          <Save size={10} /> CACHE TO BUFFER
                        </button>
                     </div>
                    
                    <div className="flex-1 flex items-center justify-center gap-1 px-2">
                      {[...Array(18)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: isSpeaking ? [15, Math.random() * 50 + 15, 15] : 6
                          }}
                          transition={{
                            duration: 0.35,
                            repeat: Infinity,
                            delay: i * 0.02,
                            ease: "easeInOut"
                          }}
                          className={`w-1 rounded-full transition-all duration-500 ${isSpeaking ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-zinc-800'}`}
                        />
                      ))}
                    </div>

                    <div className="mt-3 flex justify-between items-center border-t border-zinc-800 pt-2 shrink-0">
                      <div className="flex gap-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Rate</span>
                          <span className="text-[10px] font-mono text-zinc-400">48K</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Depth</span>
                          <span className="text-[10px] font-mono text-zinc-400">32B</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-zinc-700 uppercase font-black tracking-widest underline decoration-emerald-500/50">LIVE LINK</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'library' ? (
              <motion.div 
                key="library"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                   <div>
                      <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tighter">Buffer History</h2>
                      <p className="text-[10px] text-zinc-500 font-mono tracking-widest">PERSISTENT CACHE ({savedAudios.length})</p>
                   </div>
                   <div className="flex gap-2">
                       <button className="text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest px-4 py-2 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all">EXPORT ALL</button>
                   </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                  {savedAudios.map(audio => {
                    const voiceConfig = getVoiceConfig(audio.voiceName);
                    const displayName = voiceConfig.customName || audio.voiceName.split(' (')[0];
                    return (
                      <div key={audio.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between group hover:border-zinc-700 transition-all hover:translate-x-1 duration-300">
                        <div className="flex-1 min-w-0 mr-6">
                          <p className="text-zinc-300 text-sm line-clamp-2 leading-relaxed mb-3 font-medium">"{audio.text}"</p>
                          <div className="flex flex-wrap gap-3 items-center">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-950 rounded text-[10px] font-mono text-zinc-500 border border-zinc-800">
                              <User size={10} className="text-emerald-500" /> {displayName}
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-950 rounded text-[10px] font-mono text-zinc-500 border border-zinc-800">
                              <Clock size={10} className="text-zinc-600" /> {new Date(audio.timestamp).toLocaleTimeString()}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500">
                              {audio.rate}x / {audio.pitch}x
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={() => {
                              setText(audio.text);
                              setSelectedVoice(audio.voiceName);
                              setPitch(audio.pitch);
                              setRate(audio.rate);
                              setActiveTab('editor');
                            }}
                            className="w-10 h-10 bg-zinc-800 hover:bg-emerald-500 text-zinc-400 hover:text-zinc-950 rounded-xl flex items-center justify-center transition-all active:scale-90"
                            title="Restore Settings"
                          >
                            <Play size={16} fill="currentColor" />
                          </button>
                          <button 
                            onClick={() => deleteFromHistory(audio.id)}
                            className="w-10 h-10 bg-zinc-800 hover:bg-red-500/20 text-zinc-600 hover:text-red-500 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {savedAudios.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-10">
                       <History size={64} />
                       <span className="text-xl font-black mt-4 uppercase">No Cached Tracks</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="management"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                   <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tighter">Configuration Engine</h2>
                   <p className="text-[10px] text-zinc-500 font-mono tracking-widest">ADVANCED VOICE REGISTRY PARAMETERS</p>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Voice Identity</th>
                        <th className="px-6 py-4">Metadata</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {filteredVoices.map(voice => (
                        <tr key={voice.name} className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors ${voice.isDisabled ? 'opacity-40' : ''}`}>
                          <td className="px-6 py-4">
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => toggleVoiceConfig(voice.name, 'isDisabled')}
                                  className={`p-1.5 rounded-lg border ${voice.isDisabled ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}
                                >
                                  <Power size={14} />
                                </button>
                                <button 
                                  onClick={() => toggleVoiceConfig(voice.name, 'isHidden')}
                                  className={`p-1.5 rounded-lg border ${voice.isHidden ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-500'}`}
                                >
                                  {voice.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                            {editingVoiceId === voice.name ? (
                              <div className="flex gap-2">
                                <input 
                                  autoFocus 
                                  value={editNameValue} 
                                  onChange={(e) => setEditNameValue(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && updateVoiceName(voice.name, editNameValue)}
                                  className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none w-48"
                                />
                                <button onClick={() => updateVoiceName(voice.name, editNameValue)} className="text-emerald-500"><Check size={14}/></button>
                                <button onClick={() => setEditingVoiceId(null)} className="text-zinc-500"><X size={14}/></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-200">{voice.displayName}</span>
                                {voice.customName && <span className="text-[8px] text-zinc-600 font-mono">({voice.name.split(' ')[0]})</span>}
                                <button 
                                  onClick={() => { setEditingVoiceId(voice.name); setEditNameValue(voice.displayName); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-zinc-100"
                                >
                                  <Edit2 size={10} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                               <span className="text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">{voice.lang}</span>
                               <span className="text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">{voice.gender}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {voice.isCloned && (
                              <button 
                                onClick={() => deleteVoice(voice.name)}
                                className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Cloning Modal Simulation */}
      <AnimatePresence>
        {isCloningModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setIsCloningModalOpen(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                  <UserPlus size={24} className="text-emerald-500" />
                </div>
                <div>
                   <h2 className="text-xl font-black uppercase tracking-tight">Vocal Extraction</h2>
                   <p className="text-[10px] text-zinc-500 font-mono tracking-widest">OFFLINE CLONING ENGINE v1.2</p>
                </div>
              </div>

              {cloningStep === 1 ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Model Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. My Narrator..."
                      value={newVoiceMeta.name}
                      onChange={(e) => setNewVoiceMeta({...newVoiceMeta, name: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Gender Tag</label>
                      <select 
                        value={newVoiceMeta.gender}
                        onChange={(e) => setNewVoiceMeta({...newVoiceMeta, gender: e.target.value as any})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      >
                         <option value="male">Male</option>
                         <option value="female">Female</option>
                         <option value="non-binary">Non-Binary</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Age Maturity</label>
                      <select 
                        value={newVoiceMeta.age}
                        onChange={(e) => setNewVoiceMeta({...newVoiceMeta, age: e.target.value as any})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      >
                         <option value="child">Niño</option>
                         <option value="teen">Adolescente</option>
                         <option value="young-adult">Adulto Joven</option>
                         <option value="adult">Adulto Madu.</option>
                         <option value="senior">A. Mayor</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={() => setCloningStep(2)}
                    disabled={!newVoiceMeta.name}
                    className="w-full py-4 bg-zinc-100 text-zinc-950 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all disabled:opacity-20"
                  >
                    Next: Capture Profile
                  </button>
                </div>
              ) : (
                <div className="space-y-8 py-4">
                  <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="w-32 h-32 rounded-full border-4 border-zinc-800 flex items-center justify-center relative">
                      {isRecording && (
                        <motion.div 
                          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute inset-0 bg-emerald-500 rounded-full"
                        />
                      )}
                      <button 
                        onMouseDown={() => setIsRecording(true)}
                        onMouseUp={() => setIsRecording(false)}
                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all relative z-10 ${isRecording ? 'bg-emerald-500 text-zinc-900 scale-90' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                      >
                        <Mic2 size={32} />
                      </button>
                    </div>
                    <div className="text-center">
                       <p className="text-zinc-100 font-bold uppercase tracking-widest text-xs">{isRecording ? 'Capturing Frequency...' : 'Hold to Record Sample'}</p>
                       <p className="text-[10px] text-zinc-500 font-mono mt-2 uppercase tracking-tighter">Please speak for at least 5 seconds</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setCloningStep(1)}
                      className="flex-1 py-4 border border-zinc-800 text-zinc-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-800/50 hover:text-zinc-300 transition-all font-bold"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleCloneVoice}
                      className="flex-[2] py-4 bg-emerald-500 text-zinc-950 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all"
                    >
                      Synthesize Model
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Footer Actions */}
      <footer className="mt-6 flex flex-col md:flex-row gap-6 items-center shrink-0">
        <div className="flex-1 hidden lg:flex items-center gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
          <Info size={16} className="text-zinc-600" />
          <p className="text-[10px] text-zinc-500 font-medium leading-tight">
            PRO TIP: <span className="text-zinc-400 italic">Adjust spectral pitch below 1.0 for a more "cinematic" narrator effect.</span>
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={isSpeaking ? handleStop : handleSpeak}
            disabled={!text || isOnlineLoading}
            className={`flex-1 md:flex-none flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] px-10 py-4 rounded-full transition-all active:scale-95 shadow-xl ${
              isSpeaking 
                ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
            } ${(!text || isOnlineLoading) && 'opacity-50 cursor-not-allowed'}`}
          >
            {isOnlineLoading ? (
               <><Activity size={16} className="animate-spin" /> PIPELINING...</>
            ) : isSpeaking ? (
              <><Square size={16} fill="currentColor" /> TERMINATE STREAM</>
            ) : (
              <><Play size={16} fill="currentColor" /> INITIATE VOX</>
            )}
          </button>

          <button 
             onClick={handleDownload}
             className="flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-black text-xs uppercase tracking-[0.2em] px-10 py-4 rounded-full transition-all active:scale-95 border border-zinc-700"
          >
            <Download size={16} /> EXPORT MP3
          </button>

          <button 
            onClick={handleReset}
            className="p-4 bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-zinc-100 hover:border-zinc-700 rounded-full transition-all active:rotate-180 duration-500 md:hidden xl:block"
            title="Reset Logic"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="flex gap-5 text-zinc-600 uppercase text-[9px] font-black tracking-widest ml-auto hidden xl:flex">
          <span className="hover:text-zinc-400 cursor-pointer">Settings</span>
          <span className="text-zinc-800">|</span>
          <span className="hover:text-zinc-400 cursor-pointer">Manual</span>
          <span className="text-zinc-800">|</span>
          <span className="hover:text-zinc-400 cursor-pointer">v4.2.1</span>
        </div>
      </footer>
    </div>
  );
}
