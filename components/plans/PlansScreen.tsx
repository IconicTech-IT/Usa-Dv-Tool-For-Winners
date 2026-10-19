"use client";

import { useId, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { NameInput } from "@/components/plans/NameInput";
import { MAX_PLANS } from "@/lib/calc/library";
import { MAX_NAME_LENGTH } from "@/lib/calc/model";
import { usePlan, type PlanView } from "@/lib/calc/use-plan";

/** The list of saved plans: open, rename, duplicate, delete (after a question), and make a new one. */
export function PlansScreen() {
  const t = useTranslations("plans");
  const view = usePlan();
  const [message, setMessage] = useState<string | null>(null);

  const create = (name: string) => {
    setMessage(view.actions.newPlan(name) ? null : t("full"));
  };

  return (
    <div className="calc-page">
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <ul className="plan-list" aria-label={t("listLabel")}>
        {view.plans.map((entry, index) => (
          <PlanRow key={entry.id} view={view} index={index} onMessage={setMessage} />
        ))}
      </ul>
      <section className="card" style={{ marginTop: 16 }}>
        <h2 className="card-title">{t("newHeading")}</h2>
        <NewPlan onCreate={create} disabled={view.plans.length >= MAX_PLANS} />
      </section>
      {message === null ? null : (
        <div className="errt" role="status">
          {message}
        </div>
      )}
    </div>
  );
}

function NewPlan({ onCreate, disabled }: { onCreate: (name: string) => void; disabled: boolean }) {
  const t = useTranslations("plans");
  const id = useId();
  const [draft, setDraft] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCreate(draft);
    setDraft("");
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label className="label" htmlFor={id}>
          {t("nameLabel")}
        </label>
        <div className="input">
          <input
            id={id}
            value={draft}
            maxLength={MAX_NAME_LENGTH}
            placeholder={t("namePlaceholder")}
            autoComplete="off"
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
      </div>
      <div className="help">{t("nameHelp")}</div>
      <button type="submit" className="btn pr" style={{ marginTop: 12 }} disabled={disabled}>
        {t("create")}
      </button>
    </form>
  );
}

interface PlanRowProps {
  view: PlanView;
  index: number;
  onMessage: (message: string | null) => void;
}

function PlanRow({ view, index, onMessage }: PlanRowProps) {
  const t = useTranslations("plans");
  const locale = useLocale();
  const [isRenaming, setIsRenaming] = useState(false);
  const entry = view.plans[index];
  if (!entry) return null;

  const name = entry.name !== "" ? entry.name : `${t("defaultName")} ${index + 1}`;
  const isActive = entry.id === view.activeId;
  const updated = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(entry.updatedAt));

  return (
    <li className={isActive ? "plan-row on" : "plan-row"}>
      {isRenaming ? (
        <NameInput
          initial={entry.name}
          label={t("rename")}
          placeholder={name}
          autoFocus
          onCommit={(next) => {
            view.actions.renamePlan(entry.id, next);
            setIsRenaming(false);
          }}
          onCancel={() => setIsRenaming(false)}
        />
      ) : (
        <div className="plan-head">
          <b>{name}</b>
          {isActive ? <span className="per">{t("active")}</span> : null}
        </div>
      )}
      <div className="help">
        {t("updated")}: {updated}
      </div>
      <PlanRowActions
        view={view}
        entryId={entry.id}
        name={name}
        isActive={isActive}
        onRename={() => setIsRenaming(true)}
        onMessage={onMessage}
      />
    </li>
  );
}

interface PlanRowActionsProps {
  view: PlanView;
  entryId: string;
  name: string;
  isActive: boolean;
  onRename: () => void;
  onMessage: (message: string | null) => void;
}

function PlanRowActions({ view, entryId, name, isActive, onRename, onMessage }: PlanRowActionsProps) {
  const t = useTranslations("plans");
  const remove = () => {
    if (window.confirm(t("deleteConfirm", { name }))) view.actions.deletePlan(entryId);
  };
  const duplicate = () => onMessage(view.actions.duplicatePlan(entryId) ? null : t("full"));

  return (
    <div className="plan-actions">
      {isActive ? null : (
        <button
          type="button"
          className="btn sec"
          aria-label={`${t("open")}: ${name}`}
          onClick={() => view.actions.openPlan(entryId)}
        >
          {t("open")}
        </button>
      )}
      <button type="button" className="btn sec" aria-label={`${t("rename")}: ${name}`} onClick={onRename}>
        {t("rename")}
      </button>
      <button type="button" className="btn sec" aria-label={`${t("duplicate")}: ${name}`} onClick={duplicate}>
        {t("duplicate")}
      </button>
      <button type="button" className="btn ghost2" aria-label={`${t("delete")}: ${name}`} onClick={remove}>
        {t("delete")}
      </button>
    </div>
  );
}
