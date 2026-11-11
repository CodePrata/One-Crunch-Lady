"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import {
  createFaqItem,
  deleteFaqItem,
  reorderFaqItems,
  toggleFaqItemPublished,
  updateFaqItem,
} from "@/app/actions/admin";
import { assertOk } from "@/lib/admin-client";
import type { AdminFaqItem } from "@/types/admin";

interface FaqDraft {
  question: string;
  answer: string;
}

const EMPTY_FAQ_DRAFT: FaqDraft = { question: "", answer: "" };

/**
 * Manages the questions shown on /faq (faq_items table,
 * 016_create_faq_items.sql). Mirrors AdminBannersPanel's create-form +
 * list shape, with AdminProductsPanel's inline-edit pattern and ▲/▼
 * reordering on top.
 */
export default function AdminFaqPanel({
  initialFaqItems,
  onFeedback,
}: {
  initialFaqItems: AdminFaqItem[];
  onFeedback: (message: string) => void;
}) {
  const router = useRouter();
  const [faqItems, setFaqItems] = useState<AdminFaqItem[]>(initialFaqItems);
  const [isCreating, setIsCreating] = useState(false);
  const [newItem, setNewItem] = useState<FaqDraft>(EMPTY_FAQ_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FaqDraft>(EMPTY_FAQ_DRAFT);
  // Blocks overlapping reorders - each move sends the full order, so two
  // in flight at once could land out of sequence.
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    setFaqItems(initialFaqItems);
  }, [initialFaqItems]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      assertOk(await createFaqItem(newItem));
      onFeedback("Question added.");
      setNewItem(EMPTY_FAQ_DRAFT);
      setIsCreating(false);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to add question.");
    }
  }

  function startEditing(item: AdminFaqItem) {
    setEditingId(item.id);
    setEditDraft({ question: item.question, answer: item.answer });
  }

  async function handleSaveEdit(itemId: string) {
    try {
      assertOk(await updateFaqItem(itemId, editDraft));
      onFeedback("Question updated.");
      setFaqItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? { ...item, question: editDraft.question.trim(), answer: editDraft.answer.trim() }
            : item
        )
      );
      setEditingId(null);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to update question.");
    }
  }

  async function handleTogglePublished(itemId: string, isPublished: boolean) {
    try {
      assertOk(await toggleFaqItemPublished(itemId, isPublished));
      onFeedback(isPublished ? "Question published." : "Question hidden from the FAQ page.");
      setFaqItems((current) =>
        current.map((item) => (item.id === itemId ? { ...item, is_published: isPublished } : item))
      );
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to update question.");
    }
  }

  async function handleDelete(itemId: string) {
    const confirmed = window.confirm("Delete this question? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      assertOk(await deleteFaqItem(itemId));
      onFeedback("Question deleted.");
      setFaqItems((current) => current.filter((item) => item.id !== itemId));
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to delete question.");
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (isReordering || targetIndex < 0 || targetIndex >= faqItems.length) {
      return;
    }

    const previous = faqItems;
    const reordered = [...faqItems];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    // Optimistic - the list moves immediately, and rolls back if the save fails.
    setFaqItems(reordered);
    setIsReordering(true);

    try {
      assertOk(await reorderFaqItems(reordered.map((item) => item.id)));
      router.refresh();
    } catch (error) {
      setFaqItems(previous);
      onFeedback(error instanceof Error ? error.message : "Failed to reorder questions.");
    } finally {
      setIsReordering(false);
    }
  }

  return (
    <>
      <section className="mb-8 rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <button
          type="button"
          onClick={() => setIsCreating((current) => !current)}
          className="tap-target rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white"
        >
          Add New Question
        </button>

        {isCreating ? (
          <form onSubmit={handleCreate} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-cookie-brown-dark">
              Question
              <input
                required
                maxLength={200}
                value={newItem.question}
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, question: event.target.value }))
                }
                className="tap-target rounded-md border-2 border-cookie-brown px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-cookie-brown-dark">
              Answer
              <textarea
                required
                maxLength={2000}
                rows={4}
                value={newItem.answer}
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, answer: event.target.value }))
                }
                className="rounded-md border-2 border-cookie-brown px-3 py-2 font-normal"
              />
            </label>
            <button
              type="submit"
              className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 font-semibold text-cookie-brown-dark"
            >
              Add Question
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h2 className="font-display text-4xl uppercase text-cookie-brown-dark">FAQ</h2>
        <p className="mt-1 text-sm text-cookie-brown-dark">
          Shown on the FAQ page in this order. Hidden questions stay here but aren&apos;t shown to
          customers.
        </p>

        {faqItems.length === 0 ? (
          <p className="mt-4 text-sm text-cookie-brown-dark">
            No questions yet - customers will see a &quot;Questions coming soon!&quot; message on
            the FAQ page until one is added.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {faqItems.map((item, index) => (
              <div key={item.id} className="flex gap-3 rounded-xl border-2 border-cookie-brown p-3">
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0 || isReordering}
                    aria-label={`Move "${item.question}" up`}
                    className="tap-target flex items-center justify-center rounded-md border-2 border-cookie-brown text-cookie-brown-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowUp size={18} weight="bold" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === faqItems.length - 1 || isReordering}
                    aria-label={`Move "${item.question}" down`}
                    className="tap-target flex items-center justify-center rounded-md border-2 border-cookie-brown text-cookie-brown-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowDown size={18} weight="bold" aria-hidden="true" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  {editingId === item.id ? (
                    <div className="grid gap-2">
                      <label className="grid gap-1 text-sm font-semibold text-cookie-brown-dark">
                        Question
                        <input
                          maxLength={200}
                          value={editDraft.question}
                          onChange={(event) =>
                            setEditDraft((current) => ({
                              ...current,
                              question: event.target.value,
                            }))
                          }
                          className="tap-target rounded-md border-2 border-cookie-brown px-3 font-normal"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-semibold text-cookie-brown-dark">
                        Answer
                        <textarea
                          maxLength={2000}
                          rows={5}
                          value={editDraft.answer}
                          onChange={(event) =>
                            setEditDraft((current) => ({
                              ...current,
                              answer: event.target.value,
                            }))
                          }
                          className="rounded-md border-2 border-cookie-brown px-3 py-2 font-normal"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 text-sm font-semibold text-cookie-brown-dark"
                        >
                          Save Question
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown-dark"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-cookie-brown-dark">
                        {item.question}
                        {item.is_published ? null : (
                          <span className="ml-2 rounded border-2 border-cookie-brown px-1.5 text-xs uppercase">
                            Hidden
                          </span>
                        )}
                      </p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-cookie-brown-dark">
                        {item.answer}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown-dark"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePublished(item.id, !item.is_published)}
                          className={`tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold ${
                            item.is_published
                              ? "bg-hero-yellow text-cookie-brown-dark"
                              : "bg-cookie-brown-dark text-flour-white"
                          }`}
                        >
                          {item.is_published ? "Hide" : "Publish"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown-dark transition hover:text-power-red"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
