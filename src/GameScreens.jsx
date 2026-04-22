import React, { useEffect, useRef, useState } from "react";
import { AGENTS } from "./simulator.js";

function StatusIcon({ kind }) {
  if (kind === "critical") {
    return (
      <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
        <path d="M12 3 2 21h20L12 3Zm0 6.2 4.1 7.1H7.9L12 9.2Zm-.9 9.1h1.8v1.8h-1.8v-1.8Z" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "volatile") {
    return (
      <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
        <path d="M13.2 2 6 13h4l-1.2 9L18 10h-4.2L13.2 2Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm4.7 7.5-5.5 6.2-3-2.9 1.2-1.2 1.6 1.5 4.2-4.7 1.5 1.1Z" fill="currentColor" />
    </svg>
  );
}

function ToolIcon({ kind }) {
  if (kind === "shield-civilians") {
    return (
      <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
        <path d="M12 3 5 6v5c0 5 3.4 9.7 7 11 3.6-1.3 7-6 7-11V6l-7-3Z" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "balanced-command") {
    return (
      <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
        <path d="M12 4 4 8l8 4 8-4-8-4Zm-6 7v5l6 4 6-4v-5l-6 3-6-3Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
      <path d="M6 19h12v2H6zM12 2l5 8h-3v6h-4v-6H7l5-8Z" fill="currentColor" />
    </svg>
  );
}

function DiceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
      <circle cx="15" cy="15" r="1.4" fill="currentColor" />
      <circle cx="9" cy="15" r="1.4" fill="currentColor" />
      <circle cx="15" cy="9" r="1.4" fill="currentColor" />
    </svg>
  );
}

function ActionIcon({ kind }) {
  if (kind === "stabilize-and-calm" || kind === "shield-civilians") {
    return (
      <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
        <path d="M12 21s-6.7-4.4-8.7-8.3C1.2 8.7 3.5 5 7.3 5c2 0 3.2 1.1 4.7 2.8C13.5 6.1 14.7 5 16.7 5c3.8 0 6.1 3.7 4 7.7C18.7 16.6 12 21 12 21Z" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "balanced-command" || kind === "anchor-grid") {
    return (
      <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
        <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 2.2 5.8 2.9L12 11 6.2 8.1 12 5.2Zm-6 4.4 5 2.5v6L6 15.6V9.6Zm7 8.5v-6l5-2.5v6L13 18.1Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 11-14h-6l-1-6Z" fill="currentColor" />
    </svg>
  );
}

function shortChoiceLabel(option) {
  const labels = {
    "verified-relays": "Trace Source",
    "global-blackout": "Blackout",
    "stabilize-and-calm": "Patch + Calm",
    "seal-hard": "Seal Zones",
    "cut-and-preserve": "Cut Nodes",
    "military-override": "Defense Control",
    "anchor-grid": "Anchor Grid",
    "mass-evacuate": "Evacuate",
    "quarantine-and-soothe": "Quarantine",
    "purge-fast": "Fast Purge"
  };
  return labels[option.id] ?? option.label;
}

function shortChoiceHint(option) {
  return option.tone === "stable" ? "Safe" : option.tone === "volatile" ? "Risk" : "Danger";
}

function visibleDebateMessages(messages) {
  return messages.slice(-2);
}

function loadoutForAgent(agentName) {
  if (agentName === "Ares Prime") return { label: "Shock Command", icon: "aggressive-push" };
  if (agentName === "Nova Sage") return { label: "Calmline Broadcast", icon: "shield-civilians" };
  if (agentName === "Lady Astra") return { label: "Consensus Weave", icon: "balanced-command" };
  if (agentName === "Core AI") return { label: "Optimization Mesh", icon: "aggressive-push" };
  return { label: "Pattern Solver", icon: "balanced-command" };
}

function getBrowserFallbackMessage(reason) {
  if (!reason) return "";
  if (reason === "missing_credentials") return "Browser voice active: ElevenLabs key or voice is missing.";
  if (reason === "playback_failed") return "Browser voice active: audio playback was blocked.";
  if (reason.startsWith("elevenlabs_")) {
    const status = reason.replace("elevenlabs_", "");
    return `Browser voice active: ElevenLabs returned ${status}.`;
  }
  return "Browser voice active.";
}

function summarizeStrength(agent) {
  return agent.strengths.slice(0, 2).join(" / ");
}

function summarizeWeakness(agent) {
  const weakness = agent.weaknesses.find((value) => !["trust", "low trust", "slow decisions", "slower urgency"].includes(value))
    ?? agent.weaknesses[0]
    ?? "limited flexibility";
  return weakness;
}

export function BackgroundAudioControls({ bgmMuted, bgmVolume, onToggleMute, onVolumeChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div className={`bgm-audio-controls ${open ? "open" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="bgm-audio-button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close volume controls" : "Open volume controls"}
        aria-expanded={open}
        title={open ? "Close volume controls" : "Open volume controls"}
      >
        {bgmMuted ? "🔇" : "🔊"}
      </button>
      {open ? (
        <div className="bgm-audio-panel" role="group" aria-label="Background music controls">
          <button
            type="button"
            className="bgm-mute-toggle"
            onClick={onToggleMute}
            aria-label={bgmMuted ? "Unmute background music" : "Mute background music"}
            title={bgmMuted ? "Unmute background music" : "Mute background music"}
          >
            {bgmMuted ? "Unmute" : "Mute"}
          </button>
          <input
            className="bgm-volume-slider"
            type="range"
            min="0"
            max="0.12"
            step="0.005"
            value={bgmVolume}
            onChange={onVolumeChange}
            aria-label="Background music volume"
          />
          <button type="button" className="bgm-panel-close" onClick={() => setOpen(false)} aria-label="Close volume controls">
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function IntroScreen({
  introVideoRef,
  introAudioEnabled,
  introStoryText,
  introVideo,
  onToggleIntroAudio,
  onSkipIntro,
  onIntroEnded
}) {
  return (
    <section className="intro-screen" aria-label="Voices of the Last World intro">
      <video
        ref={introVideoRef}
        className="intro-video"
        src={introVideo}
        autoPlay
        muted={!introAudioEnabled}
        playsInline
        onEnded={onIntroEnded}
      />
      <div className="intro-overlay" />
      <div className="intro-controls">
        <button
          type="button"
          className="intro-audio-button"
          onClick={onToggleIntroAudio}
          aria-label={introAudioEnabled ? "Mute intro audio" : "Unmute intro audio"}
          title={introAudioEnabled ? "Mute intro audio" : "Unmute intro audio"}
        >
          {introAudioEnabled ? "🔊" : "🔇"}
        </button>
        <button type="button" className="skip-intro-button" onClick={onSkipIntro}>
          Skip Intro
        </button>
      </div>
      <div className="intro-copy">
        <h1 className="intro-title">
          <span className="intro-title-word intro-title-archive">Voices</span>
          <span className="intro-title-word intro-title-protocol">of the Last World</span>
        </h1>
        <p className="intro-storyline">
          {introStoryText}
          <span className="typewriter-caret" aria-hidden="true" />
        </p>
      </div>
    </section>
  );
}

export function ScenarioScreen({ operatorLabel, currentScenario, scenarioIndex, scenarios, onMoveScenario, onSelectScenario, onContinue }) {
  return (
    <section className="scenario-panel">
      <div className="scenario-content screen-stage">
        <p className="selection-kicker">{operatorLabel}</p>
        <h2 className="scenario-heading">Select The Scenario</h2>
        <div className="scenario-selector" role="list" aria-label="Scenario selection">
          <button
            type="button"
            className="scenario-chip active scenario-chip-carousel"
            onClick={() => onSelectScenario(scenarios[scenarioIndex])}
          >
            <span className="scenario-chip-media">
              <img src={currentScenario.selection_image} alt={currentScenario.scenario_title} />
            </span>
            <span className="scenario-chip-copy">
              <strong>{currentScenario.scenario_title}</strong>
              <span>{currentScenario.scenario_description}</span>
            </span>
          </button>
          <div className="scenario-selector-nav" aria-label="Scenario navigation">
            <button type="button" className="scenario-nav-button" onClick={() => onMoveScenario(-1)} aria-label="Previous scenario">
              ‹
            </button>
            <button type="button" className="scenario-nav-button" onClick={() => onMoveScenario(1)} aria-label="Next scenario">
              ›
            </button>
          </div>
        </div>
        <div className="bottom-actions stretch">
          <button type="button" className="primary-button" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </section>
  );
}

export function SelectionScreen({ operatorLabel, selectedScenario, roster, selectedAgents, hoveredCharacter, onToggleAgent, onHoverCharacter, onBlurCharacter, onDeploy }) {
  return (
    <section className="screen-stage selection-stage">
      <div className="selection-heading">
        <p className="selection-kicker">
          {operatorLabel} // {selectedScenario.scenario_title}
        </p>
        <h2>Choose 2 minds for this scenario</h2>
      </div>
      <div className="selection-grid selection-grid-visual">
        {roster.map((character) => {
          const agent = AGENTS[character.name];
          const selected = selectedAgents.includes(character.name);
          const previewing = hoveredCharacter === character.name && character.video;
          return (
            <article
              key={character.name}
              className={`character-card ${selected ? "selected" : ""}`}
              style={{ "--accent": AGENTS[character.name].color }}
            >
              <div className="character-frame">
                <button
                  type="button"
                  className="character-card-hit"
                  aria-pressed={selected}
                  onClick={() => onToggleAgent(character.name)}
                  onMouseEnter={() => onHoverCharacter(character.name)}
                  onMouseLeave={onBlurCharacter}
                  onFocus={() => onHoverCharacter(character.name)}
                  onBlur={onBlurCharacter}
                >
                  <span className="sr-only">{selected ? "Deselect" : "Select"} {character.name}</span>
                </button>
                {previewing ? (
                  <video
                    key={character.video}
                    className="character-preview-video"
                    src={character.video}
                    poster={character.poster}
                    autoPlay
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img className="character-image" src={character.poster} alt={character.name} />
                )}
                <div className={`character-selection-mark ${selected ? "visible" : ""}`} aria-hidden="true">
                  <span />
                </div>
              </div>
              <div className="character-card-copy">
                <h3>{character.name}</h3>
                <p className="character-role">{agent.role}</p>
                <div className="character-chip-row">
                  <span className="character-chip good">Best at {summarizeStrength(agent)}</span>
                  <span className="character-chip risk">Risk {summarizeWeakness(agent)}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="bottom-actions">
        <button
          type="button"
          className="primary-button"
          disabled={selectedAgents.length !== 2}
          onClick={onDeploy}
        >
          Deploy Minds
        </button>
      </div>
    </section>
  );
}

function DebatePortrait({ agentName, card, speaking }) {
  const loadout = loadoutForAgent(agentName);
  return (
    <article className={`debate-portrait ${speaking ? "speaking" : ""}`} style={{ "--speaker": AGENTS[agentName].color }}>
      <div className="debate-media-frame">
        <img className="debate-image" src={card?.poster ?? card?.image} alt={agentName} />
      </div>
      <div className="debate-portrait-copy">
        <div className="dialogue-speaker" style={{ color: AGENTS[agentName].color }}>
          {agentName}
        </div>
        <div className="agent-loadout-chip">
          <ToolIcon kind={loadout.icon} />
          <span>{loadout.label}</span>
        </div>
      </div>
    </article>
  );
}

function DebateHeader({ scenarioTitle, scenarioBrief }) {
  return (
    <div className="debate-header">
      <span className="debate-header-title">{scenarioTitle}</span>
      <span className="debate-header-sep" aria-hidden="true">•</span>
      <span className="debate-header-brief">{scenarioBrief}</span>
    </div>
  );
}

export function DebateScreen({
  selectedScenario,
  activeDebateRoster,
  activeLine,
  debateMessages,
  showActiveTypingBubble,
  typedDialogue,
  getRosterEntry,
  debateStage,
  choiceOptions,
  toolOptions,
  executionOptions,
  simulation,
  decisionBusy,
  onChooseStrategy,
  onChooseTool,
  onChooseExecution,
  onRestart,
  browserFallback
}) {
  const leftCard = getRosterEntry(activeDebateRoster[0]);
  const rightCard = getRosterEntry(activeDebateRoster[1]);
  const recentMessages = visibleDebateMessages(debateMessages);

  return (
    <section className="debate-panel debate-panel-scenario" style={{ "--discussion-image": `url(${selectedScenario.backdrop})` }}>
      <div className="debate-stage">
        <DebatePortrait
          agentName={activeDebateRoster[0]}
          card={leftCard}
          speaking={activeLine?.speaker === activeDebateRoster[0]}
        />
        <div className="debate-thread debate-thread-centered debate-thread-board">
          <DebateHeader
            scenarioTitle={selectedScenario.scenario_title}
            scenarioBrief={selectedScenario.simple_brief ?? selectedScenario.scenario_description}
          />
          {recentMessages.map((message, index) => {
            const side =
              message.speaker === activeDebateRoster[0]
                ? "left"
                : message.speaker === activeDebateRoster[1]
                  ? "right"
                  : "center";
            const card = side === "left" ? leftCard : rightCard;
            return (
              <div key={`${message.speaker}-${index}`} className={`chat-row ${side}`}>
                {side === "left" ? (
                  <div className="chat-avatar" style={{ "--accent": AGENTS[message.speaker].color }}>
                    <img src={card?.poster ?? card?.image} alt={message.speaker} />
                  </div>
                ) : null}
                <div className={`chat-bubble ${side} mini compact`}>
                  <div className="dialogue-speaker" style={{ color: AGENTS[message.speaker]?.color ?? "#f4f8ff" }}>{message.speaker}</div>
                  <div className="dialogue-text dialogue-text-message">{message.text}</div>
                </div>
                {side === "right" ? (
                  <div className="chat-avatar" style={{ "--accent": AGENTS[message.speaker].color }}>
                    <img src={card?.poster ?? card?.image} alt={message.speaker} />
                  </div>
                ) : null}
              </div>
            );
          })}
          {showActiveTypingBubble && activeLine ? (
            <div className={`chat-row ${activeLine.speaker === activeDebateRoster[0] ? "left" : activeLine.speaker === activeDebateRoster[1] ? "right" : "center"}`}>
              {activeLine.speaker === activeDebateRoster[0] ? (
                <div className="chat-avatar live" style={{ "--accent": AGENTS[activeLine.speaker].color }}>
                  <img src={leftCard?.poster ?? leftCard?.image} alt={activeLine.speaker} />
                </div>
              ) : null}
              <div className={`chat-bubble typing mini compact ${activeLine.speaker === activeDebateRoster[0] ? "left" : activeLine.speaker === activeDebateRoster[1] ? "right" : "center"}`}>
                <div className="dialogue-speaker" style={{ color: AGENTS[activeLine.speaker]?.color ?? "#f4f8ff" }}>
                  {activeLine.speaker}
                </div>
                <div className="dialogue-text dialogue-text-message">
                  {typedDialogue}
                  <span className="dialogue-caret" aria-hidden="true" />
                </div>
              </div>
              {activeLine.speaker === activeDebateRoster[1] ? (
                <div className="chat-avatar live" style={{ "--accent": AGENTS[activeLine.speaker].color }}>
                  <img src={rightCard?.poster ?? rightCard?.image} alt={activeLine.speaker} />
                </div>
              ) : null}
            </div>
          ) : null}
          {debateStage === "strategy" && !decisionBusy ? (
            <div className="inline-decision-panel compact inline-thread-panel">
              <div className="inline-decision-copy">
                <span className="mission-focus-label">Pick a move</span>
              </div>
              <div className="inline-decision-grid">
                {choiceOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`choice-card inline compact ${option.tone}`}
                    disabled={decisionBusy}
                    onClick={() => onChooseStrategy(option.id)}
                  >
                    <span className={`choice-emblem ${option.tone} large`} aria-hidden="true">
                      <ActionIcon kind={option.id} />
                    </span>
                    <span className="choice-label">{shortChoiceLabel(option)}</span>
                    <span className={`choice-risk choice-risk-${option.tone}`}>{shortChoiceHint(option)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {debateStage === "tool" && !decisionBusy ? (
            <div className="inline-decision-panel compact inline-thread-panel">
              <div className="inline-decision-copy">
                <span className="mission-focus-label">Pick a tool</span>
              </div>
              <div className="inline-decision-grid">
                {toolOptions.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className="directive-card inline compact"
                    disabled={decisionBusy}
                    onClick={() => onChooseTool(tool.id)}
                  >
                    <span className="choice-emblem stable large" aria-hidden="true">
                      <ToolIcon kind={tool.id} />
                    </span>
                    <span className="directive-label">{tool.label}</span>
                    <strong className="directive-tool-name">{tool.tool.label}</strong>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {debateStage === "execute" && !decisionBusy ? (
            <div className="inline-decision-panel compact inline-thread-panel">
              <div className="inline-decision-copy">
                <span className="mission-focus-label">Pick a finish</span>
              </div>
              <div className="inline-decision-grid">
                {executionOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="directive-card inline compact"
                    disabled={decisionBusy}
                    onClick={() => onChooseExecution(option.id)}
                  >
                    <span className="choice-emblem stable large" aria-hidden="true">
                      <ActionIcon kind={option.id} />
                    </span>
                    <span className="directive-label">{option.label}</span>
                    <strong className="directive-tool-name">{option.summary}</strong>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {debateStage === "result" ? (
            <div className={`inline-result-panel inline-thread-panel ${simulation.result}`}>
              {simulation.result === "success" ? (
                <div className="result-confetti" aria-hidden="true">
                  {Array.from({ length: 18 }).map((_, index) => (
                    <span key={index} style={{ "--delay": `${index * 0.12}s`, "--x": `${(index % 6) * 16}%` }} />
                  ))}
                </div>
              ) : null}
              <span className="mission-focus-label">
                {simulation.result === "success"
                  ? "Mission Saved"
                  : simulation.result === "partial_success"
                    ? "Mission Survived"
                    : "Mission Lost"}
              </span>
              <h3 className="inline-result-title">{simulation.meta.narrative.title}</h3>
              <p className="inline-result-text">{simulation.meta.narrative.explanation}</p>
              <button type="button" className="primary-button" onClick={onRestart}>
                New Operation
              </button>
            </div>
          ) : null}
        </div>
        <DebatePortrait
          agentName={activeDebateRoster[1]}
          card={rightCard}
          speaking={activeLine?.speaker === activeDebateRoster[1]}
        />
      </div>
      {false ? (
        <div className="browser-fallback-badge" role="status" aria-live="polite">
          ⚠️ Browser voice active — ElevenLabs unavailable
        </div>
      ) : null}
    </section>
  );
}

export function ChoiceScreen({
  selectedScenario,
  choiceOptions,
  directiveOptions,
  toolOptions,
  scenarioReadout,
  selectedChoiceId,
  selectedDirectiveId,
  selectedAgents,
  getRosterEntry,
  stage,
  onSelectChoice,
  onSelectDirective,
  onContinueFromStrategy,
  onBackToStrategy,
  onResolve
}) {
  const strategySelected = choiceOptions.find((option) => option.id === selectedChoiceId);

  return (
    <section className="choice-panel screen-stage">
      <div className="choice-copy">
        <p className="eyebrow">{selectedScenario.scenario_title}</p>
        <h2>{stage === "strategy" ? "Mission control is live." : "Choose the support tool."}</h2>
        <p className="choice-lead">
          {stage === "strategy"
            ? "Watch the live threat feed, then click the task your minds should execute."
            : "Now pick the team tool that shapes how they carry the task out."}
        </p>
      </div>
      <div className="scenario-readout" aria-label="Scenario live status">
        {scenarioReadout.map((item) => (
          <article key={item.label} className={`readout-card ${item.state}`}>
            <div className="readout-head">
              <StatusIcon kind={item.state} />
              <span>{item.label}</span>
            </div>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
      <div className="choice-cast" aria-label="Selected minds">
        {selectedAgents.map((agentName) => {
          const card = getRosterEntry(agentName);
          const loadout = loadoutForAgent(agentName);
          return (
            <article key={agentName} className="choice-cast-card" style={{ "--accent": AGENTS[agentName].color }}>
              <img src={card?.poster ?? card?.image} alt={agentName} />
              <div>
                <strong>{agentName}</strong>
                <span>{AGENTS[agentName].role}</span>
                <span className="choice-cast-tool"><ToolIcon kind={loadout.icon} /> {loadout.label}</span>
              </div>
            </article>
          );
        })}
      </div>
      {stage === "strategy" ? (
        <>
          <div className="choice-grid choice-grid-split">
            {choiceOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                className={`choice-card choice-${index + 1} ${selectedChoiceId === option.id ? "selected" : ""}`}
                onClick={() => onSelectChoice(option.id)}
              >
                <span className={`choice-emblem ${option.tone}`} aria-hidden="true">
                  <DiceIcon />
                </span>
                <span className="choice-index">Task 0{index + 1}</span>
                <span className="choice-label">{option.label}</span>
                <span className="choice-summary">{option.summary}</span>
                <span className={`choice-risk choice-risk-${option.tone}`}>
                  {option.tone === "stable" ? "Safer route" : option.tone === "volatile" ? "High pressure" : "Dangerous route"}
                </span>
              </button>
            ))}
          </div>
          <div className="bottom-actions stretch">
            <button
              type="button"
              className="primary-button"
              disabled={!selectedChoiceId}
              onClick={onContinueFromStrategy}
            >
              Continue
            </button>
          </div>
        </>
      ) : (
        <div className="directive-panel">
          {strategySelected ? (
            <div className="selected-plan-note">
              <span className="directive-label">Selected Task</span>
              <strong>{strategySelected.label}</strong>
              <p>{strategySelected.summary}</p>
            </div>
          ) : null}
          <div className="choice-step-copy">
            <h3>Pick the tool they deploy.</h3>
            <p className="choice-step-lead">Each tool changes the feel and outcome of the response.</p>
          </div>
          <div className="directive-grid">
            {toolOptions.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`directive-card ${selectedDirectiveId === tool.id ? "selected" : ""}`}
                onClick={() => onSelectDirective(tool.id)}
              >
                <span className="directive-label"><ToolIcon kind={tool.id} /> {tool.label}</span>
                <strong className="directive-tool-name">{tool.tool.label}</strong>
                <span className="directive-summary">{tool.tool.summary}</span>
                <span className="directive-summary">{tool.summary}</span>
              </button>
            ))}
          </div>
          <div className="bottom-actions stretch">
            <button type="button" className="secondary-button" onClick={onBackToStrategy}>
              Back
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!selectedDirectiveId}
              onClick={onResolve}
            >
              Commit Response
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function ResultScreen({ selectedScenario, simulation, influenceEntries, resultRoster, influence, onRestart }) {
  const statusLine =
    simulation.result === "success"
      ? "You saved the mission"
      : simulation.result === "partial_success"
        ? "You barely kept it together"
        : "The mission was lost";
  const showConfetti = simulation.result === "success";

  return (
    <section className="result-grid screen-stage">
      <article className="panel-block result-hero result-hero-merged">
        {showConfetti ? (
          <div className="result-confetti" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <span key={index} style={{ "--delay": `${index * 0.12}s`, "--x": `${(index % 6) * 16}%` }} />
            ))}
          </div>
        ) : null}
        <p className="eyebrow">{selectedScenario.scenario_title}</p>
        <p className={`result-status-line ${simulation.result}`}>{statusLine}</p>
        <h2 className={`result-title ${simulation.result}`}>{simulation.meta.narrative.title}</h2>
        <p className="result-lead">{simulation.meta.narrative.explanation}</p>
        {simulation.meta.score_breakdown ? (
          <div className="result-scoreboard">
            <div className="score-block">
              <span className="score-label">Team Readiness</span>
              <strong>{simulation.meta.score_breakdown.team_fit}</strong>
            </div>
            <div className="score-block">
              <span className="score-label">Task Pick</span>
              <strong>{simulation.meta.score_breakdown.strategy}</strong>
            </div>
            <div className="score-block">
              <span className="score-label">Tool Pick</span>
              <strong>{simulation.meta.score_breakdown.directive}</strong>
            </div>
            <div className="score-block score-block-final">
              <span className="score-label">Outcome</span>
              <strong>{simulation.meta.score_breakdown.final}</strong>
            </div>
          </div>
        ) : null}
        <div className="result-agent-duel result-agent-duel-hero">
          {resultRoster.map(({ name, card }) => {
            const item = influenceEntries.find((entry) => entry.agent === name);
            const led = simulation.final_decision.led_by === name;
            return (
              <article key={name} className={`result-agent-card ${led ? "led" : ""}`} style={{ "--accent": AGENTS[name].color }}>
                <div className="result-agent-media">
                  <img src={card?.poster ?? card?.image} alt={name} />
                </div>
                <div className="result-agent-copy">
                  <div className="result-agent-head">
                    <h3>{name}</h3>
                    <span>{item?.score ?? 50}%</span>
                  </div>
                  <div className="result-agent-meter">
                    <div className="result-agent-meter-fill" style={{ width: `${item?.score ?? 50}%` }} />
                  </div>
                  <p>{item?.verdict}</p>
                </div>
              </article>
            );
          })}
        </div>
        <p className="result-rationale">{simulation.final_decision.summary}</p>
        <p className="result-summary-note">{influence?.why ?? simulation.meta.why.at(-1)}</p>
      </article>

      <div className="bottom-actions stretch">
        <button type="button" className="secondary-button" onClick={onRestart}>
          New Operation
        </button>
      </div>
    </section>
  );
}
