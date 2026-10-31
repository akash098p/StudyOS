import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpenCheck, RotateCw, Shuffle } from 'lucide-react'
import type { Subject } from '../api'
import { questionBank, type Difficulty, type FlashcardQuestion } from '../data/questionBank'

type AnswerStatus = 'correct' | 'incorrect'
type FeedbackType = 'success' | 'warning' | 'error' | 'info'
type Progress = Record<string, AnswerStatus>

interface FlashcardWorkspaceProps {
  subjects: Subject[]
  userId: number
  onManageSubjects: () => void
  onFeedback: (message: string, type: FeedbackType) => void
}

const aliases: Record<string, string[]> = {
  'Computer Science': ['computer science', 'computer', 'programming', 'coding', 'software', 'cs', 'it'],
  Mathematics: ['mathematics', 'math', 'maths', 'algebra', 'calculus', 'geometry', 'statistics'],
  Physics: ['physics', 'mechanics', 'electricity'],
  Chemistry: ['chemistry', 'chemical', 'organic chemistry'],
  Biology: ['biology', 'biological', 'botany', 'zoology', 'anatomy', 'life science'],
  English: ['english', 'literature', 'language arts', 'writing'],
  History: ['history', 'historical', 'civics', 'social studies'],
  Geography: ['geography', 'geographic'],
  Economics: ['economics', 'economy', 'commerce', 'business studies'],
  Psychology: ['psychology', 'psychological'],
  'Environmental Science': ['environmental science', 'environment', 'ecology'],
  Art: ['art', 'visual arts', 'design'],
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function subjectQuestions(name: string): FlashcardQuestion[] {
  const normalizedName = normalize(name)
  const paddedName = ` ${normalizedName} `
  return questionBank.filter(question => {
    const terms = aliases[question.subject] || [question.subject]
    return terms.some(term => {
      const normalizedTerm = normalize(term)
      const paddedTerm = ` ${normalizedTerm} `
      return (
        normalizedName === normalizedTerm ||
        paddedName.includes(paddedTerm) ||
        paddedTerm.includes(paddedName)
      )
    })
  })
}

function shuffle<T>(values: T[]): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

function readProgress(storageKey: string): Progress {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '{}')
    if (typeof saved === 'object' && saved !== null && !Array.isArray(saved)) {
      return Object.fromEntries(
        Object.entries(saved).filter(
          (entry): entry is [string, AnswerStatus] =>
            entry[1] === 'correct' || entry[1] === 'incorrect'
        )
      )
    }
  } catch {
    // Ignore unavailable or malformed optional progress storage.
  }
  return {}
}

export function FlashcardWorkspace({
  subjects,
  userId,
  onManageSubjects,
  onFeedback,
}: FlashcardWorkspaceProps) {
  const storageKey = `studyos.flashcards.v1.${userId}`
  const [selectedSubjectId, setSelectedSubjectId] = useState(() => String(subjects[0]?.id ?? ''))
  const [topic, setTopic] = useState('All topics')
  const [difficulty, setDifficulty] = useState<'All difficulties' | Difficulty>('All difficulties')
  const [reviewMode, setReviewMode] = useState(false)
  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [savedProgress, setSavedProgress] = useState(() => ({
    userId,
    answers: readProgress(storageKey),
  }))
  const progress =
    savedProgress.userId === userId ? savedProgress.answers : readProgress(storageKey)

  useEffect(() => {
    if (!subjects.some(subject => String(subject.id) === selectedSubjectId)) {
      setSelectedSubjectId(String(subjects[0]?.id ?? ''))
      setTopic('All topics')
      setDifficulty('All difficulties')
      setReviewMode(false)
      setIndex(0)
      setRevealed(false)
      setShuffledIds(null)
    }
  }, [selectedSubjectId, subjects])

  useEffect(() => {
    setTopic('All topics')
    setDifficulty('All difficulties')
    setReviewMode(false)
    setIndex(0)
    setRevealed(false)
    setShuffledIds(null)
  }, [userId])

  useEffect(() => {
    if (savedProgress.userId !== userId) {
      setSavedProgress({ userId, answers: readProgress(storageKey) })
      return
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedProgress.answers))
    } catch {
      // Progress remains available for the current session when storage is unavailable.
    }
  }, [savedProgress, storageKey, userId])

  const selectedSubject = subjects.find(subject => String(subject.id) === selectedSubjectId)
  const subjectDeck = useMemo(
    () => (selectedSubject ? subjectQuestions(selectedSubject.name) : []),
    [selectedSubject]
  )
  const topics = useMemo(
    () => [...new Set(subjectDeck.map(question => question.topic))].sort((a, b) => a.localeCompare(b)),
    [subjectDeck]
  )
  const filteredDeck = useMemo(
    () =>
      subjectDeck.filter(
        question =>
          (topic === 'All topics' || question.topic === topic) &&
          (difficulty === 'All difficulties' || question.difficulty === difficulty) &&
          (!reviewMode || progress[question.id] === 'incorrect')
      ),
    [difficulty, progress, reviewMode, subjectDeck, topic]
  )
  const questions = useMemo(() => {
    if (!shuffledIds) return filteredDeck
    const byId = new Map(filteredDeck.map(question => [question.id, question]))
    return shuffledIds.flatMap(id => {
      const question = byId.get(id)
      return question ? [question] : []
    })
  }, [filteredDeck, shuffledIds])
  const question = questions[index]
  const completedCount = subjectDeck.filter(item => progress[item.id]).length
  const incorrectCount = subjectDeck.filter(item => progress[item.id] === 'incorrect').length
  const correctCount = subjectDeck.filter(item => progress[item.id] === 'correct').length

  function resetDeck() {
    setIndex(0)
    setRevealed(false)
    setShuffledIds(null)
  }

  function selectSubject(id: string) {
    setSelectedSubjectId(id)
    setTopic('All topics')
    setDifficulty('All difficulties')
    setReviewMode(false)
    resetDeck()
  }

  function markAnswer(status: AnswerStatus) {
    if (!question) return
    setSavedProgress(current => {
      const answers = current.userId === userId ? current.answers : readProgress(storageKey)
      return { userId, answers: { ...answers, [question.id]: status } }
    })
    onFeedback(
      status === 'correct' ? 'Marked as known. Nice work!' : 'Added to your review list.',
      status === 'correct' ? 'success' : 'warning'
    )
    setRevealed(false)
    setIndex(current => {
      if (reviewMode && status === 'correct') {
        return current % Math.max(questions.length - 1, 1)
      }
      return (current + 1) % questions.length
    })
  }

  function moveQuestion(offset: number) {
    if (!questions.length) return
    setIndex(current => (current + offset + questions.length) % questions.length)
    setRevealed(false)
  }

  function toggleReview() {
    setReviewMode(enabled => !enabled)
    setIndex(0)
    setRevealed(false)
    setShuffledIds(null)
  }

  function shuffleDeck() {
    setShuffledIds(shuffle(filteredDeck).map(item => item.id))
    setIndex(0)
    setRevealed(false)
  }

  if (!subjects.length) {
    return (
      <div className="panel flashcard-workspace flashcard-empty">
        <BookOpenCheck size={30} />
        <h3>Add a subject to start practicing</h3>
        <p>Flashcards use the subjects saved to your StudyOS account. Add one to find a matching study deck.</p>
        <button type="button" className="primary-button" onClick={onManageSubjects}>
          Manage subjects
        </button>
      </div>
    )
  }

  return (
    <div className="panel flashcard-workspace">
      <div className="panel-heading flashcard-heading">
        <div>
          <h3>Subject flashcards</h3>
          <p>Practice a shuffled deck, track what you know, and revisit missed questions.</p>
        </div>
        <span className="count-pill">
          {questions.length ? `${index + 1} / ${questions.length}` : 'No cards'}
        </span>
      </div>

      <div className="flashcard-filters">
        <label>
          Subject
          <select value={selectedSubjectId} onChange={event => selectSubject(event.target.value)}>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Topic
          <select
            value={topics.includes(topic) || topic === 'All topics' ? topic : 'All topics'}
            onChange={event => {
              setTopic(event.target.value)
              resetDeck()
            }}
            disabled={!topics.length}
          >
            <option>All topics</option>
            {topics.map(value => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select
            value={difficulty}
            onChange={event => {
              const value = event.target.value
              setDifficulty(
                value === 'Easy' || value === 'Medium' || value === 'Hard'
                  ? value
                  : 'All difficulties'
              )
              resetDeck()
            }}
          >
            <option>All difficulties</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </label>
      </div>

      <div className="flashcard-progress" aria-live="polite">
        <span>
          Progress <strong>{completedCount} / {subjectDeck.length || 0}</strong>
        </span>
        <span className="flashcard-progress-bar">
          <i style={{ width: `${subjectDeck.length ? (completedCount / subjectDeck.length) * 100 : 0}%` }} />
        </span>
        <span>
          <strong>{correctCount}</strong> known · <strong>{incorrectCount}</strong> to review
        </span>
      </div>

      {!subjectDeck.length ? (
        <div className="flashcard-empty">
          <h3>No curated questions for {selectedSubject?.name || 'this subject'} yet</h3>
          <p>
            Your subject is saved and ready to use. For now, make a question from your notes:
            “What is one important idea in {selectedSubject?.name || 'this subject'}, and how would I explain it?”
            Add a supported subject such as Biology or Mathematics to practice its curated question bank.
          </p>
          <button type="button" className="secondary-button" onClick={onManageSubjects}>
            Manage subjects
          </button>
        </div>
      ) : !questions.length ? (
        <div className="flashcard-empty">
          <h3>{reviewMode ? 'You’re all caught up' : 'No cards match these filters'}</h3>
          <p>
            {reviewMode
              ? 'There are no missed questions for this selection. Keep practicing to build your review list.'
              : 'Try a different topic or difficulty, or switch subjects.'}
          </p>
          {reviewMode && (
            <button type="button" className="secondary-button" onClick={toggleReview}>
              Return to all questions
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flashcard-toolbar">
            <span>{question.topic} <b>·</b> {question.difficulty}</span>
            <div>
              <button type="button" className="secondary-button" onClick={shuffleDeck}>
                <Shuffle size={15} /> Shuffle
              </button>
              <button
                type="button"
                className={`secondary-button ${reviewMode ? 'active' : ''}`}
                onClick={toggleReview}
              >
                <RotateCw size={15} /> Review missed ({incorrectCount})
              </button>
            </div>
          </div>
          <button
            type="button"
            className={`flashcard ${revealed ? 'flashcard-revealed' : ''}`}
            onClick={() => setRevealed(value => !value)}
            aria-label={`${revealed ? 'Answer' : 'Question'}: ${revealed ? question.answer : question.question}. Tap to flip.`}
          >
            <span className="modal-kicker">
              {revealed ? 'ANSWER' : 'QUESTION'} · TAP TO FLIP
            </span>
            <strong>{revealed ? question.answer : question.question}</strong>
            {revealed && <span className="flashcard-explanation">{question.explanation}</span>}
            <span>{revealed ? 'Tap to return to the question' : 'Think of your answer, then reveal'}</span>
          </button>
          <div className="flashcard-actions">
            <button type="button" className="secondary-button" onClick={() => moveQuestion(-1)}>
              <ArrowLeft size={15} /> Previous
            </button>
            {revealed ? (
              <>
                <button type="button" className="secondary-button flashcard-review-button" onClick={() => markAnswer('incorrect')}>
                  Review again
                </button>
                <button type="button" className="primary-button" onClick={() => markAnswer('correct')}>
                  I knew it
                </button>
              </>
            ) : (
              <button type="button" className="primary-button" onClick={() => setRevealed(true)}>
                Reveal answer
              </button>
            )}
            <button type="button" className="secondary-button" onClick={() => moveQuestion(1)}>
              Next <ArrowRight size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
