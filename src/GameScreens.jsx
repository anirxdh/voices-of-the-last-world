import React, { useEffect, useRef, useState } from "react";
import { AGENTS } from "./simulator.js";

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
        <h2>Select The Characters For This Scenario</h2>
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
                    loop
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
                <details className="character-details">
                  <summary>Details</summary>
                  <p className="character-trait">
                    <strong>Strong:</strong> {summarizeStrength(agent)}
                  </p>
                  <p className="character-trait character-trait-risk">
                    <strong>Risk:</strong> {summarizeWeakness(agent)}
                  </p>
                </details>
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
  return (
    <article className={`debate-portrait ${speaking ? "speaking" : ""}`} style={{ "--speaker": AGENTS[agentName].color }}>
      <div className="debate-media-frame">
        <img className="debate-image" src={card?.poster ?? card?.image} alt={agentName} />
      </div>
      <div className="debate-portrait-copy">
        <div className="dialogue-speaker" style={{ color: AGENTS[agentName].color }}>
          {agentName}
        </div>
        <div className={`portrait-visualizer ${speaking ? "live" : ""}`} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </article>
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
  browserFallback
}) {
  const leftCard = getRosterEntry(activeDebateRoster[0]);
  const rightCard = getRosterEntry(activeDebateRoster[1]);

  return (
    <section className="debate-panel debate-panel-scenario" style={{ "--discussion-image": `url(${selectedScenario.backdrop})` }}>
      <div className="debate-stage">
        <DebatePortrait agentName={activeDebateRoster[0]} card={leftCard} speaking={activeLine?.speaker === activeDebateRoster[0]} />
        <div className="debate-thread debate-thread-centered">
          {debateMessages.map((message, index) => {
            const side = message.speaker === activeDebateRoster[0] ? "left" : "right";
            const card = side === "left" ? leftCard : rightCard;
            return (
              <div key={`${message.speaker}-${index}`} className={`chat-row ${side}`}>
                {side === "left" ? (
                  <div className="chat-avatar" style={{ "--accent": AGENTS[message.speaker].color }}>
                    <img src={card?.poster ?? card?.image} alt={message.speaker} />
                  </div>
                ) : null}
                <div className={`chat-bubble ${side}`}>
                  <div className="dialogue-speaker" style={{ color: AGENTS[message.speaker].color }}>
                    {message.speaker}
                  </div>
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
            <div className={`chat-row ${activeLine.speaker === activeDebateRoster[0] ? "left" : "right"}`}>
              {activeLine.speaker === activeDebateRoster[0] ? (
                <div className="chat-avatar live" style={{ "--accent": AGENTS[activeLine.speaker].color }}>
                  <img src={leftCard?.poster ?? leftCard?.image} alt={activeLine.speaker} />
                </div>
              ) : null}
              <div className={`chat-bubble typing ${activeLine.speaker === activeDebateRoster[0] ? "left" : "right"}`}>
                <div className="dialogue-speaker" style={{ color: AGENTS[activeLine.speaker].color }}>
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
        </div>
        <DebatePortrait agentName={activeDebateRoster[1]} card={rightCard} speaking={activeLine?.speaker === activeDebateRoster[1]} />
      </div>
      {browserFallback ? (
        <div className="browser-fallback-badge" role="status" aria-live="polite">
          ⚠️ Browser voice active — ElevenLabs unavailable
        </div>
      ) : null}
    </section>
  );
}

export function ChoiceScreen({ selectedScenario, choiceOptions, directiveOptions, selectedChoiceId, selectedDirectiveId, onSelectChoice, onSelectDirective, onResolve }) {
  return (
    <section className="choice-panel screen-stage">
      <div className="choice-copy">
        <p className="eyebrow">{selectedScenario.scenario_title}</p>
        <h2>Shape the response.</h2>
        <p className="choice-lead">Pick the strategy, then choose how the Archive should execute it.</p>
      </div>
      <div className="choice-grid">
        {choiceOptions.map((option, index) => (
          <button
            key={option.id}
            type="button"
            className={`choice-card choice-${index + 1} ${selectedChoiceId === option.id ? "selected" : ""}`}
            onClick={() => onSelectChoice(option.id)}
          >
            <span className="choice-index">0{index + 1}</span>
            <span className="choice-label">{option.label}</span>
            <span className="choice-summary">{option.summary}</span>
          </button>
        ))}
      </div>
      <div className="directive-panel">
        <div className="directive-copy">
          <p className="eyebrow">Operator Directive</p>
          <h3>How should this plan be carried out?</h3>
        </div>
        <div className="directive-grid">
          {directiveOptions.map((directive) => (
            <button
              key={directive.id}
              type="button"
              className={`directive-card ${selectedDirectiveId === directive.id ? "selected" : ""}`}
              onClick={() => onSelectDirective(directive.id)}
            >
              <span className="directive-label">{directive.label}</span>
              <span className="directive-summary">{directive.summary}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="bottom-actions stretch">
        <button
          type="button"
          className="primary-button"
          disabled={!selectedChoiceId || !selectedDirectiveId}
          onClick={onResolve}
        >
          Commit Response
        </button>
      </div>
    </section>
  );
}

export function ResultScreen({ selectedScenario, simulation, influenceEntries, resultRoster, influence, onRestart }) {
  return (
    <section className="result-grid screen-stage">
      <article className="panel-block result-hero result-hero-merged">
        <p className="eyebrow">{selectedScenario.scenario_title}</p>
        <p className={`result-status-line ${simulation.result}`}>
          {simulation.result === "success"
            ? "Mission Success"
            : simulation.result === "partial_success"
              ? "Mission Compromised"
              : "Mission Failed"}
        </p>
        <h2 className={`result-title ${simulation.result}`}>{simulation.meta.narrative.title}</h2>
        <p className="result-lead">{simulation.meta.narrative.explanation}</p>
        {simulation.meta.score_breakdown ? (
          <div className="result-scoreboard">
            <div className="score-block">
              <span className="score-label">Team Fit</span>
              <strong>{simulation.meta.score_breakdown.team_fit}</strong>
            </div>
            <div className="score-block">
              <span className="score-label">Strategy</span>
              <strong>{simulation.meta.score_breakdown.strategy}</strong>
            </div>
            <div className="score-block">
              <span className="score-label">Directive</span>
              <strong>{simulation.meta.score_breakdown.directive}</strong>
            </div>
            <div className="score-block score-block-final">
              <span className="score-label">Final Score</span>
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
