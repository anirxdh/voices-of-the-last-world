import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildResultNarration, fallbackAgents, getRosterEntry, INTRO_STORYLINE, roster } from "./appContent.jsx";
import { AUDIO, BACKGROUNDS, VIDEOS } from "./media.js";
import { runSimulationEngine } from "./engine.js";
import {
  BackgroundAudioControls,
  ChoiceScreen,
  DebateScreen,
  IntroScreen,
  ResultScreen,
  ScenarioScreen,
  SelectionScreen
} from "./GameScreens.jsx";
import {
  OPERATOR_DIRECTIVES,
  SCENARIOS,
  applyPlayerChoice,
  mergeEngineOutputWithLocal,
  simulateScenario
} from "./simulator.js";
import {
  estimateSpeechDurationMs,
  setElevenLabsApiKey,
  speakAgentLine,
  stopVoicePlayback
} from "./voice.js";

export default function App() {
  const [introStage, setIntroStage] = useState(0);
  const [introAudioEnabled, setIntroAudioEnabled] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.055);
  const [phase, setPhase] = useState("scenario");
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [currentScenario, setCurrentScenario] = useState(() => SCENARIOS[0]);
  const [selectedScenario, setSelectedScenario] = useState(() => SCENARIOS[0]);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [activeVoiceIndex, setActiveVoiceIndex] = useState(-1);
  const [browserFallback, setBrowserFallback] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [selectedDirectiveId, setSelectedDirectiveId] = useState("");
  const [typedDialogue, setTypedDialogue] = useState("");
  const [hoveredCharacter, setHoveredCharacter] = useState("");
  const [debateMessages, setDebateMessages] = useState([]);
  const [introStoryText, setIntroStoryText] = useState("");
  const [simulation, setSimulation] = useState(() => simulateScenario(SCENARIOS[0], fallbackAgents));

  const introVideoRef = useRef(null);
  const ambientAudioRef = useRef(null);
  const typingIntervalRef = useRef(null);

  const introVisible = introStage < 2;
  const activeScenario = phase === "scenario" ? currentScenario : selectedScenario;
  const simulationAgents = selectedAgents.length === 2 ? selectedAgents : fallbackAgents;
  const activeDebateRoster = selectedAgents.length === 2 ? selectedAgents : simulation.selected_agents;
  const activeLine = activeVoiceIndex >= 0 ? simulation.conversation[activeVoiceIndex] : null;
  const appBackground = phase === "scenario" ? BACKGROUNDS.app : activeScenario.backdrop || BACKGROUNDS.app;
  const operatorLabel = "Operator";

  const fallbackPreview = useMemo(
    () => simulateScenario(activeScenario, simulationAgents),
    [activeScenario, simulationAgents]
  );

  const influence = simulation.meta?.influence;
  const influenceEntries =
    influence?.influences ??
    activeDebateRoster.map((agentName, index) => ({
      agent: agentName,
      score: index === 0 ? 52 : 48,
      verdict:
        simulation.final_decision.led_by === agentName
          ? `${agentName} drove the final call.`
          : `${agentName} supported the outcome without dominating it.`
    }));

  const resultRoster = simulation.selected_agents.map((agentName) => ({
    name: agentName,
    card: getRosterEntry(agentName)
  }));
  const choiceOptions = simulation.meta?.choice_options ?? [];
  const directiveOptions = simulation.meta?.directive_options ?? OPERATOR_DIRECTIVES;
  const lastDebateMessage = debateMessages[debateMessages.length - 1];
  const showActiveTypingBubble =
    Boolean(activeLine && typedDialogue) &&
    (!lastDebateMessage ||
      lastDebateMessage.speaker !== activeLine.speaker ||
      lastDebateMessage.text !== activeLine.text);
  const shouldPlayAmbient =
    !introVisible &&
    (phase === "scenario" ||
      phase === "selection" ||
      phase === "decision" ||
      phase === "result");

  useEffect(() => {
    if (!introVisible || !introVideoRef.current) return;

    const video = introVideoRef.current;
    video.muted = !introAudioEnabled;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(() => {});
    }
  }, [introStage, introAudioEnabled, introVisible]);

  useEffect(() => {
    const audio = ambientAudioRef.current;
    if (!audio) return;

    audio.volume = bgmMuted ? 0 : bgmVolume;

    if (shouldPlayAmbient && !bgmMuted) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {});
      }
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  }, [bgmMuted, bgmVolume, shouldPlayAmbient]);

  useEffect(() => {
    if (!introVisible) {
      setIntroStoryText("");
      return undefined;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setIntroStoryText(INTRO_STORYLINE.slice(0, index));
      if (index >= INTRO_STORYLINE.length) {
        window.clearInterval(timer);
      }
    }, 20);

    return () => window.clearInterval(timer);
  }, [introVisible]);

  useEffect(() => {
    if (phase === "selection" || phase === "scenario") {
      setSimulation(fallbackPreview);
    }
  }, [fallbackPreview, phase]);

  useEffect(() => {
    if (phase !== "debate") {
      setTypedDialogue("");
      setDebateMessages([]);
      return undefined;
    }

    let cancelled = false;
    setActiveVoiceIndex(-1);
    setBrowserFallback(false);
    setTypedDialogue("");
    setDebateMessages([]);

    const revealLine = (speaker, text) =>
      new Promise((resolve) => {
        if (typingIntervalRef.current) {
          window.clearInterval(typingIntervalRef.current);
        }

        setTypedDialogue("");

        if (!text) {
          resolve();
          return;
        }

        let charIndex = 0;
        const durationMs = estimateSpeechDurationMs(speaker, text);
        const lineDelay = Math.max(26, Math.min(74, durationMs / Math.max(text.length, 1)));

        typingIntervalRef.current = window.setInterval(() => {
          if (cancelled) {
            window.clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
            resolve();
            return;
          }

          charIndex += 1;
          setTypedDialogue(text.slice(0, charIndex));

          if (charIndex >= text.length) {
            window.clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
            resolve();
          }
        }, lineDelay);
      });

    const runDebate = async () => {
      for (let index = 0; index < simulation.conversation.length; index += 1) {
        if (cancelled) return;

        const line = simulation.conversation[index];
        setActiveVoiceIndex(index);
        setTypedDialogue("");

        try {
          const [result] = await Promise.all([
            speakAgentLine(line.speaker, line.text),
            revealLine(line.speaker, line.text)
          ]);
          if (result?.provider === "browser") setBrowserFallback(true);
          if (cancelled) return;
        } catch {
          if (cancelled) return;
        }

        setDebateMessages((current) => [...current, line]);
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }

      if (!cancelled) {
        setActiveVoiceIndex(-1);
        setTypedDialogue("");
        window.setTimeout(() => {
          if (!cancelled) {
            setPhase("choice");
          }
        }, 700);
      }
    };

    void runDebate();

    return () => {
      cancelled = true;
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      stopVoicePlayback();
    };
  }, [phase, simulation]);

  useEffect(() => () => stopVoicePlayback(), []);

  useEffect(() => {
    if (phase !== "result") return undefined;

    const narrate = async () => {
      try {
        await speakAgentLine("Core AI", buildResultNarration(simulation, selectedScenario.scenario_title));
      } catch {}
    };

    void narrate();
    return () => {
      stopVoicePlayback();
    };
  }, [phase, simulation, selectedScenario]);

  useEffect(() => {
    const envApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (envApiKey) {
      setElevenLabsApiKey(envApiKey);
    }
  }, []);

  function toggleAgent(name) {
    setSelectedAgents((current) => {
      if (current.includes(name)) {
        return current.length === 1 ? current : current.filter((entry) => entry !== name);
      }

      if (current.length < 2) {
        return [...current, name];
      }

      return [current[1], name];
    });
  }

  function confirmScenario() {
    setSelectedScenario(currentScenario);
    setPhase("selection");
  }

  function moveScenario(direction) {
    const nextIndex = (scenarioIndex + direction + SCENARIOS.length) % SCENARIOS.length;
    setScenarioIndex(nextIndex);
    setCurrentScenario(SCENARIOS[nextIndex]);
  }

  async function runSimulation() {
    try {
      const response = await runSimulationEngine({
        selectedAgents,
        scenario: selectedScenario,
        currentStats: selectedScenario.stats
      });

      setSimulation(
        mergeEngineOutputWithLocal(selectedScenario, selectedAgents, response.output, selectedScenario.stats)
      );
    } catch {
      setSimulation(fallbackPreview);
    }

    setSelectedChoiceId("");
    setSelectedDirectiveId("");
    setPhase("debate");
  }

  function deployAgents() {
    if (selectedAgents.length !== 2) return;
    void runSimulation();
  }

  function restartMission() {
    setPhase("scenario");
    setCurrentScenario(SCENARIOS[0]);
    setSelectedScenario(SCENARIOS[0]);
    setSelectedAgents([]);
    setSelectedChoiceId("");
    setSelectedDirectiveId("");
  }

  function resolveChoice() {
    if (!selectedChoiceId || !selectedDirectiveId) return;
    setSimulation((current) => applyPlayerChoice(current, selectedChoiceId, selectedDirectiveId));
    setPhase("result");
  }

  return (
    <main className="app-shell">
      <audio ref={ambientAudioRef} src={AUDIO.ambient} loop preload="auto" />

      {!introVisible ? (
        <BackgroundAudioControls
          bgmMuted={bgmMuted}
          bgmVolume={bgmVolume}
          onToggleMute={() => setBgmMuted((value) => !value)}
          onVolumeChange={(event) => {
            const value = Number(event.target.value);
            setBgmVolume(value);
            if (value > 0 && bgmMuted) {
              setBgmMuted(false);
            }
          }}
        />
      ) : null}

      {introVisible ? (
        <IntroScreen
          introVideoRef={introVideoRef}
          introAudioEnabled={introAudioEnabled}
          introStoryText={introStoryText}
          introVideo={VIDEOS.intro}
          onToggleIntroAudio={() => setIntroAudioEnabled((value) => !value)}
          onSkipIntro={() => setIntroStage(2)}
          onIntroEnded={() => setIntroStage(2)}
        />
      ) : null}

      <div className="background-layer" style={{ "--app-background": `url(${appBackground})` }} />
      <div className="background-grid" />

      <section className={`game-shell ${phase === "debate" ? "full-bleed" : ""}`}>
        {phase === "scenario" ? (
          <ScenarioScreen
            operatorLabel={operatorLabel}
            currentScenario={currentScenario}
            scenarioIndex={scenarioIndex}
            scenarios={SCENARIOS}
            onMoveScenario={moveScenario}
            onSelectScenario={setCurrentScenario}
            onContinue={confirmScenario}
          />
        ) : null}

        {phase === "selection" ? (
          <SelectionScreen
            operatorLabel={operatorLabel}
            selectedScenario={selectedScenario}
            roster={roster}
            selectedAgents={selectedAgents}
            hoveredCharacter={hoveredCharacter}
            onToggleAgent={toggleAgent}
            onHoverCharacter={setHoveredCharacter}
            onBlurCharacter={() => setHoveredCharacter("")}
            onDeploy={deployAgents}
          />
        ) : null}

        {phase === "debate" ? (
          <DebateScreen
            selectedScenario={selectedScenario}
            activeDebateRoster={activeDebateRoster}
            activeLine={activeLine}
            debateMessages={debateMessages}
            showActiveTypingBubble={showActiveTypingBubble}
            typedDialogue={typedDialogue}
            getRosterEntry={getRosterEntry}
            browserFallback={browserFallback}
          />
        ) : null}

        {phase === "choice" ? (
          <ChoiceScreen
            selectedScenario={selectedScenario}
            choiceOptions={choiceOptions}
            directiveOptions={directiveOptions}
            selectedChoiceId={selectedChoiceId}
            selectedDirectiveId={selectedDirectiveId}
            onSelectChoice={setSelectedChoiceId}
            onSelectDirective={setSelectedDirectiveId}
            onResolve={resolveChoice}
          />
        ) : null}

        {phase === "result" ? (
          <ResultScreen
            selectedScenario={selectedScenario}
            simulation={simulation}
            influenceEntries={influenceEntries}
            resultRoster={resultRoster}
            influence={influence}
            onRestart={restartMission}
          />
        ) : null}
      </section>
    </main>
  );
}
