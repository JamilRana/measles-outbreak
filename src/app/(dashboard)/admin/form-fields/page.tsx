"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, Trash2, GripVertical, AlertCircle, ChevronDown,
  Eye, EyeOff, Hash, Type, List, Calendar, ToggleLeft,
  Star, Copy, Settings, ChevronUp, Check, Loader2, Save,
  RefreshCw, FileText, Zap, X, Info, LayoutTemplate,
  ShieldCheck, AlertTriangle, ArrowRight, MousePointer2,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent, DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { motion, AnimatePresence } from "motion/react";
import {
  ValidationRule, RULE_META, rulesForFieldType, RuleMeta,
} from "@/lib/validation-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

type FieldType = "NUMBER" | "TEXT" | "SELECT" | "DATE" | "BOOLEAN";

interface FormField {
  id: string;
  label: string;
  labelBn: string;
  fieldKey: string;
  fieldType: FieldType;
  options: string;
  section: string;
  isRequired: boolean;
  isCoreField: boolean;
  sortOrder: number;
  activeFrom: string;
  activeTo: string;
  validationRules: ValidationRule[];
  _isNew?: boolean;
  _dirty?: boolean;
}

interface Outbreak {
  id: string;
  name: string;
  disease: { name: string };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string; icon: any; desc: string }[] = [
  { value: "NUMBER",  label: "Number",    icon: Hash,       desc: "Integer or decimal" },
  { value: "TEXT",    label: "Short text",icon: Type,       desc: "Single-line text" },
  { value: "SELECT",  label: "Dropdown",  icon: List,       desc: "Choose from a list" },
  { value: "DATE",    label: "Date",      icon: Calendar,   desc: "Date picker" },
  { value: "BOOLEAN", label: "Yes / No",  icon: ToggleLeft, desc: "Toggle" },
];

const SECTIONS = [
  { key: "cases",           label: "Cases & Burden",      color: "bg-rose-50 border-rose-200 text-rose-700",   accent: "bg-rose-500" },
  { key: "mortality",       label: "Mortality",            color: "bg-slate-50 border-slate-200 text-slate-700", accent: "bg-slate-500" },
  { key: "hospitalization", label: "Clinical Management",  color: "bg-indigo-50 border-indigo-200 text-indigo-700", accent: "bg-indigo-500" },
  { key: "lab",             label: "Laboratory",           color: "bg-purple-50 border-purple-200 text-purple-700", accent: "bg-purple-500" },
  { key: "other",           label: "Other",                color: "bg-slate-50 border-slate-200 text-slate-500", accent: "bg-slate-400" },
];

const SECTION_MAP = Object.fromEntries(SECTIONS.map(s => [s.key, s]));
const sectionColor = (k: string) => SECTION_MAP[k]?.color ?? SECTION_MAP["other"].color;
const typeIcon = (t: FieldType, className = "w-4 h-4") => {
  const Icon = FIELD_TYPES.find(f => f.value === t)?.icon ?? Hash;
  return <Icon className={className} />;
};
const autoKey = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 40);

// ─── Field preview ────────────────────────────────────────────────────────────

function FieldPreview({ field }: { field: FormField }) {
  const opts = (() => { try { return JSON.parse(field.options || "[]"); } catch { return []; } })();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-slate-800 tracking-tight">
          {field.label || <span className="text-slate-400 font-normal italic">Untitled field</span>}
        </p>
        {field.isRequired && <span className="text-rose-500 font-bold">*</span>}
      </div>
      {field.labelBn && <p className="text-xs text-slate-500 font-medium font-bengali">{field.labelBn}</p>}
      
      <div className="mt-1">
        {field.fieldType === "NUMBER" && <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-400 font-mono shadow-inner">0</div>}
        {field.fieldType === "TEXT"   && <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-400 shadow-inner">Your answer</div>}
        {field.fieldType === "DATE"   && <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-400 flex justify-between items-center shadow-inner">YYYY-MM-DD <Calendar className="w-4 h-4 opacity-50" /></div>}
        {field.fieldType === "BOOLEAN"&& (
          <div className="flex items-center gap-3">
            <div className="w-12 h-6 bg-slate-200 rounded-full flex items-center px-1"><div className="w-4 h-4 bg-white rounded-full shadow-sm" /></div>
            <span className="text-sm font-semibold text-slate-400">Yes / No</span>
          </div>
        )}
        {field.fieldType === "SELECT" && (
          <div className="space-y-2">
            {opts.length > 0 ? opts.map((o: string, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 bg-white" />
                <span className="text-sm font-medium text-slate-600">{o || `Option ${i+1}`}</span>
              </div>
            )) : <p className="text-xs text-slate-400 italic py-2">No options defined yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sortable card ───────────────────────────────────────────────────────────

function FieldCard({ field, isActive, onSelect, onDelete, onDuplicate, isAnyDragging }: {
  field: FormField; isActive: boolean;
  onSelect: () => void; onDelete: () => void; onDuplicate: () => void;
  isAnyDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1, zIndex: isDragging ? 50 : 1 };
  const ruleCount = field.validationRules?.length ?? 0;
  
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <motion.div 
        layout
        onClick={onSelect} 
        className={`relative overflow-hidden bg-white rounded-2xl border transition-all cursor-pointer select-none
          ${isActive 
            ? "border-indigo-400 ring-2 ring-indigo-500/10 shadow-lg shadow-indigo-100/50" 
            : "border-slate-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-100"
          }
          ${isAnyDragging && !isDragging ? "opacity-40 grayscale-[0.2]" : ""}
        `}
      >
        {isActive && <div className="absolute top-0 right-0 p-1 opacity-[0.03]"><Settings className="w-16 h-16 rotate-12" /></div>}
        
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div {...attributes} {...listeners} className="p-1.5 text-slate-300 hover:text-indigo-400 cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors" onClick={e => e.stopPropagation()}>
            <GripVertical className="w-4 h-4" />
          </div>
          
          <div className={`p-2 rounded-xl flex-shrink-0 transition-all ${isActive ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-500"}`}>
            {typeIcon(field.fieldType)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <p className={`text-sm font-bold truncate tracking-tight ${!field.label ? "text-slate-300 italic font-normal" : "text-slate-800"}`}>
                {field.label || "Untitled field"}
              </p>
              {field.isRequired && <span className="text-[10px] font-black text-rose-500">REQ</span>}
            </div>
            <p className="text-[10px] text-slate-400 font-mono font-medium truncate uppercase tracking-wider">{field.fieldKey || "not-set"}</p>
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {field.isCoreField && (
              <div className="w-5 h-5 bg-amber-400 text-white rounded-lg flex items-center justify-center shadow-sm" title="Core KPI">
                <Star className="w-3 h-3 fill-current" />
              </div>
            )}
            {ruleCount > 0 && (
              <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-100 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" />
                {ruleCount}
              </div>
            )}
            <div className={`px-2 py-0.5 text-[10px] font-black rounded-lg border uppercase tracking-[0.05em] ${sectionColor(field.section)}`}>
              {SECTION_MAP[field.section]?.label.split(" ")[0] ?? field.section}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
            <button onClick={onDuplicate} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Duplicate"><Copy className="w-4 h-4" /></button>
            <button onClick={onDelete}    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
          </div>
          
          {field._dirty && <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" title="Unsaved changes" />}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Options editor ──────────────────────────────────────────────────────────

function OptionsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = (() => { try { return JSON.parse(value || "[]"); } catch { return []; } })();
  const update = (n: string[]) => onChange(JSON.stringify(n));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">Select Options</label>
        <button onClick={() => update([...opts, ""])} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-2 py-1 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {opts.map((opt: string, i: number) => (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="flex items-center gap-2 group">
            <div className="w-5 h-5 rounded-full border-2 border-slate-200 bg-white flex-shrink-0" />
            <input className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all placeholder:text-slate-300"
              value={opt} onChange={e => { const n = [...opts]; n[i] = e.target.value; update(n); }} placeholder={`Option ${i + 1}`} />
            <button onClick={() => update(opts.filter((_: any, j: number) => j !== i))} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
          </motion.div>
        ))}
        {opts.length === 0 && (
          <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No options yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Validation rule editor ───────────────────────────────────────────────────

function ValidationEditor({
  rules, fieldType, allFields, onChange,
}: {
  rules: ValidationRule[];
  fieldType: FieldType;
  allFields: FormField[];
  onChange: (rules: ValidationRule[]) => void;
}) {
  const available = rulesForFieldType(fieldType);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<string>("");

  const update = (idx: number, patch: Partial<ValidationRule>) => {
    const next = rules.map((r, i) => i === idx ? { ...r, ...patch } : r);
    onChange(next);
  };
  const remove = (idx: number) => onChange(rules.filter((_, i) => i !== idx));

  const addRule = () => {
    if (!newType) return;
    onChange([...rules, { type: newType as any, severity: "error" }]);
    setAdding(false);
    setNewType("");
  };

  const meta = (type: string): RuleMeta | undefined => RULE_META.find(m => m.type === type);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Active Guards
        </label>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl transition-all">
          <Plus className="w-3.5 h-3.5" /> New Rule
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {rules.length === 0 && !adding && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
              <ShieldCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No validation active</p>
              <button onClick={() => setAdding(true)} className="mt-4 text-xs text-indigo-600 font-bold hover:underline">Apply logic bridge</button>
            </motion.div>
          )}

          {rules.map((rule, idx) => {
            const m = meta(rule.type);
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={idx} 
                className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-sm">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 tracking-tight">{m?.label ?? rule.type}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{m?.description}</p>
                  </div>
                  <button onClick={() => remove(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  {/* Value input */}
                  {m?.hasValue && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{m.valueLabel ?? "Constraint Value"}</label>
                      <input
                        type={m.valueType === "number" ? "number" : "text"}
                        value={rule.value === undefined ? "" : String(rule.value)}
                        onChange={e => {
                          const val = e.target.value;
                          update(idx, { value: val === "" ? undefined : (m.valueType === "number" ? (isNaN(parseFloat(val)) ? undefined : parseFloat(val)) : val) });
                        }}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                        placeholder={m.valueType === "regex" ? "e.g. ^[0-9]{11}$" : "0"}
                      />
                    </div>
                  )}

                  {/* Compare-to field */}
                  {m?.hasCompareToField && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Relational Anchor</label>
                      <select
                        value={rule.compareToField ?? ""}
                        onChange={e => update(idx, { compareToField: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-50 bg-white"
                      >
                        <option value="">— select anchor field —</option>
                        {allFields.map(f => (
                          <option key={f.fieldKey} value={f.fieldKey}>{f.label || f.fieldKey} ({f.fieldKey})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Compare value (for requiredIf) */}
                  {m?.hasCompareValue && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Trigger Condition</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">When Value =</span>
                        <input
                          value={rule.compareValue ?? ""}
                          onChange={e => update(idx, { compareValue: e.target.value })}
                          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                          placeholder="target value"
                        />
                      </div>
                    </div>
                  )}

                  {/* Custom message */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">UX Feedback <span className="font-medium opacity-50">(Custom Message)</span></label>
                    <input
                      value={rule.message ?? ""}
                      onChange={e => update(idx, { message: e.target.value || undefined })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                      placeholder="Default system message will be used if blank"
                    />
                  </div>

                  {/* Severity */}
                  <div className="flex items-center justify-between pt-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enforcement</label>
                    <div className="flex gap-2">
                      {(["error", "warning"] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => update(idx, { severity: s })}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                            rule.severity === s || (!rule.severity && s === "error")
                              ? s === "error"
                                ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200"
                                : "bg-amber-400 border-amber-400 text-white shadow-md shadow-amber-100"
                              : "border-slate-200 text-slate-400 hover:bg-white"
                          }`}
                        >
                          {s === "error" ? <AlertCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add rule picker */}
        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="border-2 border-indigo-200 rounded-[2rem] p-6 bg-white shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-indigo-900 uppercase tracking-widest">Rule Catalog</p>
                <button onClick={() => setAdding(false)} className="p-1.5 text-slate-300 hover:text-slate-500"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {available.map(m => (
                  <button
                    key={m.type}
                    onClick={() => setNewType(m.type)}
                    className={`w-full flex items-start gap-4 px-4 py-3 rounded-2xl text-left transition-all border-2 ${
                      newType === m.type ? "border-indigo-600 bg-indigo-50" : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${newType === m.type ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                      {newType === m.type ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 tracking-tight">{m.label}</p>
                      <p className="text-[10px] font-medium text-slate-500 line-clamp-2">{m.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button 
                onClick={addRule} 
                disabled={!newType} 
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 disabled:opacity-40 hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                Assemble Component
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Edit panel ───────────────────────────────────────────────────────────────

function EditPanel({ field, onChange, onSave, onDelete, onDuplicate, saving, allFields }: {
  field: FormField; allFields: FormField[];
  onChange: (u: Partial<FormField>) => void;
  onSave: () => void; onDelete: () => void; onDuplicate: () => void;
  saving: boolean;
}) {
  type Tab = "edit" | "validate" | "preview";
  const [tab, setTab] = useState<Tab>("edit");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const inp = (label: string, key: keyof FormField, type = "text", ph = "", mono = false) => (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <input type={type} value={String(field[key] ?? "")}
        onChange={e => { 
          const v = e.target.value; 
          const u: Partial<FormField> = { [key]: v }; 
          if (key === "label" && field._isNew) u.fieldKey = autoKey(v); 
          onChange(u); 
        }}
        placeholder={ph}
        className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all ${mono ? "font-mono text-indigo-600" : ""}`} />
    </div>
  );

  const tog = (label: string, sub: string, key: "isRequired" | "isCoreField") => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-white hover:shadow-md transition-all group" onClick={() => onChange({ [key]: !field[key] })}>
      <div>
        <p className="text-sm font-bold text-slate-800 tracking-tight">{label}</p>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{sub}</p>
      </div>
      <div className={`w-12 h-6 rounded-full flex items-center px-1 transition-all shadow-inner ${field[key] ? "bg-indigo-600" : "bg-slate-300"}`}>
        <motion.div animate={{ x: field[key] ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
      </div>
    </div>
  );

  const ruleCount = field.validationRules?.length ?? 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tab Switcher */}
      <div className="flex p-2 bg-slate-100/50 gap-1 mx-4 mt-4 rounded-2xl border border-slate-200/50">
        {([
          { id: "edit",     label: "Entity",     icon: Settings },
          { id: "validate", label: `Rules ${ruleCount > 0 ? `(${ruleCount})` : ""}`, icon: ShieldCheck },
          { id: "preview",  label: "Live Test",  icon: Eye },
        ] as { id: Tab; label: string; icon: any }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
              ${tab === t.id 
                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50" 
                : "text-slate-400 hover:text-slate-600 hover:bg-white/50"}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence mode="wait">
          {tab === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="bg-slate-50 border-2 border-slate-200 rounded-[2rem] p-6 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.05]"><Eye className="w-24 h-24" /></div>
              <FieldPreview field={field} />
            </motion.div>
          )}

          {tab === "validate" && (
            <motion.div key="validate" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <ValidationEditor
                rules={field.validationRules ?? []}
                fieldType={field.fieldType}
                allFields={allFields.filter(f => f.id !== field.id)}
                onChange={rules => onChange({ validationRules: rules })}
              />
            </motion.div>
          )}

          {tab === "edit" && (
            <motion.div key="edit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
              {inp("Label (Interface)", "label", "text", "e.g. Suspected cases (24h)")}
              {inp("Label (Localized/BN)", "labelBn", "text", "বাংলা লেবেল")}

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Machine Key (API)</label>
                <div className="relative">
                  <input value={field.fieldKey} onChange={e => onChange({ fieldKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                    placeholder="e.g. suspected_24h" className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-mono font-bold text-indigo-600 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400" />
                  <div className="absolute left-3.5 top-3.5 text-slate-300"><Hash className="w-4 h-4" /></div>
                </div>
              </div>

              {/* Data Type Selection */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Structure</label>
                <div className="grid grid-cols-1 gap-2">
                  {FIELD_TYPES.map(ft => (
                    <button key={ft.value} onClick={() => onChange({ fieldType: ft.value })}
                      className={`flex items-center gap-4 px-4 py-3 rounded-2xl border-2 text-left transition-all
                        ${field.fieldType === ft.value 
                          ? "border-indigo-600 bg-indigo-50/50 shadow-sm" 
                          : "border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50"}`}>
                      <div className={`p-2 rounded-xl scale-90 ${field.fieldType === ft.value ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-100 text-slate-400"}`}>
                        <ft.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-black tracking-tight ${field.fieldType === ft.value ? "text-slate-900" : "text-slate-600"}`}>{ft.label}</p>
                        <p className="text-[10px] font-medium opacity-60 leading-tight">{ft.desc}</p>
                      </div>
                      {field.fieldType === ft.value && <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white"><Check className="w-3 h-3" /></div>}
                    </button>
                  ))}
                </div>
              </div>

              {field.fieldType === "SELECT" && <OptionsEditor value={field.options} onChange={v => onChange({ options: v })} />}

              {/* Logical Grouping */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">UI Section Group</label>
                <div className="grid grid-cols-1 gap-2">
                  {SECTIONS.map(s => (
                    <button key={s.key} onClick={() => onChange({ section: s.key })}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left text-[11px] font-black uppercase tracking-widest transition-all
                        ${field.section === s.key 
                          ? `border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm` 
                          : "border-slate-100 text-slate-400 hover:bg-slate-50"}`}>
                      <div className={`w-2 h-2 rounded-full ${s.accent} ${field.section !== s.key && "opacity-40 grayscale"}`} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {tog("Strictly Required", "BLOCK SUBMISSION IF EMPTY", "isRequired")}
              {tog("Global Core KPI", "SHOW ON MAIN STATUS BOARD", "isCoreField")}

              <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest pt-2">
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Configuration Lifecycle
              </button>
              
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 pt-2 border-t border-slate-100 overflow-hidden">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Activation Date</label>
                        <input type="date" value={field.activeFrom} onChange={e => onChange({ activeFrom: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-50 shadow-inner" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sunset Date</label>
                        <input type="date" value={field.activeTo} onChange={e => onChange({ activeTo: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-50 shadow-inner" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-indigo-50/50 border-2 border-dashed border-indigo-100 rounded-2xl">
                      <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-indigo-700 leading-relaxed uppercase tracking-wide">Fields remain active globally unless constraints are defined here. Use for time-limited surveillance.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200">
        <button onClick={onSave} disabled={saving || !field.label || !field.fieldKey}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-slate-900 ring-2 ring-indigo-600 hover:ring-slate-900 disabled:bg-slate-200 disabled:ring-slate-200 disabled:text-slate-400 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {field._isNew ? "Assemble Component" : "Publish Update"}
        </button>
      </div>
    </div>
  );
}

// ─── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { label: string; fields: Partial<FormField>[] }> = {
  measles: { label: "Standard Measles Module", fields: [
    { label: "Suspected cases (24h)", fieldKey: "suspected24h", fieldType: "NUMBER", section: "cases", isRequired: true, isCoreField: true, validationRules: [{ type: "min", value: 0 }, { type: "integer" }] },
    { label: "Confirmed cases (24h)", fieldKey: "confirmed24h", fieldType: "NUMBER", section: "cases", isRequired: true, isCoreField: true, validationRules: [{ type: "min", value: 0 }, { type: "integer" }, { type: "lte", compareToField: "suspected24h", message: "Confirmed cannot exceed suspected" }] },
    { label: "Suspected deaths (24h)", fieldKey: "suspectedDeath24h", fieldType: "NUMBER", section: "mortality", isRequired: true, isCoreField: true, validationRules: [{ type: "min", value: 0 }, { type: "integer" }] },
    { label: "Confirmed deaths (24h)", fieldKey: "confirmedDeath24h", fieldType: "NUMBER", section: "mortality", isRequired: true, isCoreField: true, validationRules: [{ type: "min", value: 0 }, { type: "integer" }] },
    { label: "Admitted (24h)", fieldKey: "admitted24h", fieldType: "NUMBER", section: "hospitalization", isRequired: true, isCoreField: true, validationRules: [{ type: "min", value: 0 }, { type: "integer" }] },
    { label: "Discharged (24h)", fieldKey: "discharged24h", fieldType: "NUMBER", section: "hospitalization", isRequired: false, isCoreField: false, validationRules: [{ type: "min", value: 0 }, { type: "integer" }, { type: "lte", compareToField: "admitted24h", message: "Discharged cannot exceed admitted" }] },
    { label: "Serum samples sent", fieldKey: "serumSent24h", fieldType: "NUMBER", section: "lab", isRequired: false, isCoreField: false, validationRules: [{ type: "min", value: 0 }, { type: "integer" }] },
  ]},
};

// ─── Field factory ────────────────────────────────────────────────────────────

function newField(sortOrder: number): FormField {
  return { id: `new_${Date.now()}_${Math.random().toString(36).slice(2)}`, label: "", labelBn: "", fieldKey: "", fieldType: "NUMBER", options: "[]", section: "cases", isRequired: false, isCoreField: false, sortOrder, activeFrom: "", activeTo: "", validationRules: [], _isNew: true, _dirty: true };
}

function apiToLocal(f: any): FormField {
  return {
    id: f.id, label: f.label ?? "", labelBn: f.labelBn ?? "", fieldKey: f.fieldKey ?? "",
    fieldType: f.fieldType ?? "NUMBER", options: f.options ?? "[]", section: f.section ?? "other",
    isRequired: !!f.isRequired, isCoreField: !!f.isCoreField, sortOrder: f.sortOrder ?? 0,
    activeFrom: f.activeFrom ? f.activeFrom.slice(0, 10) : "",
    activeTo:   f.activeTo   ? f.activeTo.slice(0, 10)   : "",
    validationRules: Array.isArray(f.validationRules) ? f.validationRules : [],
    _dirty: false, _isNew: false,
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FormBuilderPage() {
  const { data: session } = useSession();
  const [outbreaks, setOutbreaks]   = useState<Outbreak[]>([]);
  const [outbreakId, setOutbreakId] = useState("");
  const [fields, setFields]         = useState<FormField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreviewAll, setShowPreviewAll] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch("/api/public/outbreaks").then(r => r.json()).then((d: Outbreak[]) => {
      setOutbreaks(d); if (d.length) setOutbreakId(d[0].id);
    }).catch(console.error);
  }, []);

  const loadFields = useCallback((oid: string) => {
    if (!oid) return;
    setLoading(true); setSelectedId(null);
    fetch(`/api/admin/form-fields?outbreakId=${oid}`)
      .then(r => r.json())
      .then((d: any[]) => setFields(d.sort((a, b) => a.sortOrder - b.sortOrder).map(apiToLocal)))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFields(outbreakId); }, [outbreakId, loadFields]);

  const selectedField = useMemo(() => fields.find(f => f.id === selectedId) ?? null, [fields, selectedId]);

  const updateField = useCallback((id: string, updates: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates, _dirty: true } : f));
  }, []);

  const saveField = useCallback(async (field: FormField) => {
    if (!field.label || !field.fieldKey) { showToast("err", "Context and Key identifiers are required"); return; }
    
    // Check for duplicate keys locally before sending
    const isDuplicate = fields.some(f => f.id !== field.id && f.fieldKey === field.fieldKey);
    if (isDuplicate) { showToast("err", "Error: Dynamic key must be unique for this context"); return; }

    setSaving(true);
    try {
      const payload = {
        label: field.label, labelBn: field.labelBn || null, fieldKey: field.fieldKey,
        fieldType: field.fieldType, options: field.options || null, section: field.section || "other",
        isRequired: field.isRequired, isCoreField: field.isCoreField, sortOrder: field.sortOrder,
        activeFrom: field.activeFrom || null, activeTo: field.activeTo || null,
        validationRules: field.validationRules ?? [],
      };
      const res = field._isNew
        ? await fetch(`/api/admin/form-fields?outbreakId=${outbreakId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch(`/api/admin/form-fields/${field.id}`,              { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      if (!res.ok) { const e = await res.json(); showToast("err", e.error ?? "Assembly failure"); return; }
      const saved = await res.json();
      setFields(prev => prev.map(f => f.id === field.id ? { ...apiToLocal(saved), _dirty: false } : f));
      if (field._isNew) setSelectedId(saved.id);
      showToast("ok", field._isNew ? "Entity assembled" : "Logical update published");
    } catch { showToast("err", "Network failure"); } finally { setSaving(false); }
  }, [outbreakId, fields]);

  const addField = () => { const f = newField(fields.length + 1); setFields(p => [...p, f]); setSelectedId(f.id); };

  const duplicateField = (field: FormField) => {
    const dup = { ...newField(fields.length + 1), label: field.label + " (Clone)", labelBn: field.labelBn, fieldKey: field.fieldKey + "_alt", fieldType: field.fieldType, options: field.options, section: field.section, isRequired: field.isRequired, isCoreField: false, validationRules: [...(field.validationRules ?? [])] };
    setFields(p => [...p, dup]); setSelectedId(dup.id);
    showToast("ok", "Entity cloned — Update dynamic key before publishing");
  };

  const deleteField = async (id: string) => {
    const field = fields.find(f => f.id === id); if (!field) return;
    if (!field._isNew && !confirm(`Decommission "${field.label}"? All historical data for this field will be severed.`)) return;
    if (!field._isNew) await fetch(`/api/admin/form-fields/${id}`, { method: "DELETE" });
    setFields(p => p.filter(f => f.id !== id));
    if (selectedId === id) setSelectedId(null);
    showToast("ok", "Decommissioned");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event; setActiveDragId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex(f => f.id === active.id);
    const newIdx = fields.findIndex(f => f.id === over.id);
    const reordered = arrayMove(fields, oldIdx, newIdx).map((f, i) => ({ ...f, sortOrder: i + 1 }));
    setFields(reordered);
    
    // Batch update sort orders
    const updates = reordered.filter(f => !f._isNew).map(f => 
       fetch(`/api/admin/form-fields/${f.id}`, { 
         method: "PATCH", 
         headers: { "Content-Type": "application/json" }, 
         body: JSON.stringify({ sortOrder: f.sortOrder }) 
       })
    );
    await Promise.all(updates).catch(console.error);
  };

  const applyTemplate = async (key: string) => {
    const tpl = TEMPLATES[key]; if (!tpl) return;
    setSaving(true); setShowTemplates(false);
    let added = 0;
    // Sequential create for templates to maintain order stability
    for (const tf of tpl.fields) {
      const res = await fetch(`/api/admin/form-fields?outbreakId=${outbreakId}`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          ...tf, 
          sortOrder: fields.length + added + 1, 
          options: tf.options ?? "[]", 
          validationRules: tf.validationRules ?? [] 
        }) 
      }).catch(() => null);
      if (res?.ok) added++;
    }
    loadFields(outbreakId);
    showToast("ok", `Seeded ${added} logical components from "${tpl.label}"`);
    setSaving(false);
  };

  const dirtyCount = fields.filter(f => f._dirty && !f._isNew).length;
  const newCount   = fields.filter(f => f._isNew).length;

  if (session?.user?.role !== "ADMIN") return (
    <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] bg-white">
      <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-rose-100">
        <ShieldCheck className="w-10 h-10" />
      </div>
      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Security Protocol Violation</h1>
      <p className="text-slate-500 mt-2 font-medium max-w-xs">Elevated administrative credentials required for logical grid reconfiguration.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">

      {/* High-Intensity Header */}
      <div className="flex items-center gap-6 px-8 py-5 bg-white border-b border-slate-200 flex-shrink-0 z-20 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Form Builder Core</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dynamic Engine v2.4.0</p>
          </div>
        </div>
        
        <div className="h-10 w-px bg-slate-200" />
        
        <div className="flex flex-col">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Outbreak Scope</label>
          <select value={outbreakId} onChange={e => setOutbreakId(e.target.value)} className="px-4 py-2 border-2 border-slate-100 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-50 text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer hover:bg-white">
            {outbreaks.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-100 rounded-xl flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-black text-slate-600">{fields.length} Components</span>
          </div>
          <AnimatePresence>
            {(dirtyCount > 0 || newCount > 0) && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-amber-100">
                <AlertCircle className="w-3 h-3" />
                {newCount > 0 && `${newCount} NEW`}{dirtyCount > 0 && newCount > 0 && " • "}{dirtyCount > 0 && `${dirtyCount} DIRTY`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1" />
        
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPreviewAll(!showPreviewAll)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all ${showPreviewAll ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "border-slate-100 text-slate-500 hover:bg-slate-50"}`}>
            {showPreviewAll ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} 
            {showPreviewAll ? "Build Mode" : "User Preview"}
          </button>
          
          <div className="relative">
            <button onClick={() => setShowTemplates(!showTemplates)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 text-xs font-black uppercase tracking-widest transition-all">
              <Zap className="w-4 h-4" /> Seed Logic
            </button>
            <AnimatePresence>
              {showTemplates && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 top-full mt-3 w-72 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 overflow-hidden ring-4 ring-slate-100/50">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Templates</p></div>
                  <div className="p-2">
                    {Object.entries(TEMPLATES).map(([key, tpl]) => (
                      <button key={key} onClick={() => applyTemplate(key)} className="w-full flex items-start gap-4 px-4 py-4 hover:bg-indigo-50 rounded-2xl text-left transition-all group">
                        <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 tracking-tight">{tpl.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">{tpl.fields.length} Components</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button onClick={() => loadFields(outbreakId)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all" title="Synchronize Engine">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dynamic Toast System */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-8 py-5 rounded-[2rem] shadow-2xl border text-sm font-black uppercase tracking-widest
              ${toast.type === "ok" ? "bg-slate-900 border-slate-800 text-white" : "bg-rose-600 border-rose-500 text-white"}`}
          >
            {toast.type === "ok" ? <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div> : <AlertCircle className="w-6 h-6 shadow-sm" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Command Grid */}
      <div className="flex flex-1 overflow-hidden">

        {/* Tactical Field List */}
        <div className="w-[380px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden shadow-2xl shadow-slate-200/50 z-10">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Logical Entities</p>
              <p className="text-xs font-bold text-slate-600 mt-1">Grid Structure</p>
            </div>
            <button onClick={addField} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
              <Plus className="w-3.5 h-3.5" /> Append
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="w-12 h-12 text-slate-200 animate-spin" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Synchronizing Registry</p>
              </div>
            ) : fields.length === 0 ? (
              <div className="text-center py-32 px-10">
                <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10" />
                </div>
                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Empty Grid detected</p>
                <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">No surveillance components have been mapped. Start by appending an entity or seeding from logic.</p>
                <button onClick={addField} className="mt-8 w-full py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all">Create First Bridge</button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setActiveDragId(e.active.id as string)} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {fields.map(f => (
                      <FieldCard key={f.id} field={f} isActive={selectedId === f.id} onSelect={() => setSelectedId(f.id)} onDelete={() => deleteField(f.id)} onDuplicate={() => duplicateField(f)} isAnyDragging={!!activeDragId} />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {activeDragId && (
                    <div className="bg-white border-2 border-indigo-500 rounded-2xl px-5 py-4 shadow-[0_20px_50px_rgba(79,70,229,0.3)] opacity-95 scale-[1.02] cursor-grabbing">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md"><MousePointer2 className="w-4 h-4" /></div>
                          <div>
                            <p className="text-sm font-black text-slate-900 tracking-tight leading-none">{fields.find(f => f.id === activeDragId)?.label || "Component"}</p>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">Relocating...</p>
                          </div>
                       </div>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>

        {/* Global Visualization Theatre */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar relative">
          <AnimatePresence mode="wait">
            {showPreviewAll ? (
              <motion.div key="full-preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto p-12">
                <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl relative">
                  <div className="h-3 bg-indigo-600 w-full" />
                  <div className="p-10 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg uppercase tracking-widest">Live Prototype</div>
                      <div className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest">Verification: Active</div>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{outbreaks.find(o => o.id === outbreakId)?.name ?? "Form Preview"}</h2>
                    <div className="flex items-center gap-4 mt-6">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-xs font-bold text-slate-500 uppercase">{fields.length} Inputs</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-xs font-bold text-slate-500 uppercase">{fields.filter(f => f.isRequired).length} Enforced</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-slate-500 uppercase">{fields.filter(f => (f.validationRules?.length ?? 0) > 0).length} Logical Gates</span></div>
                    </div>
                  </div>
                  
                  <div className="p-10 space-y-12">
                    {SECTIONS.map(sec => {
                      const sf = fields.filter(f => f.section === sec.key); if (!sf.length) return null;
                      return (
                        <div key={sec.key} className="space-y-6">
                          <div className="flex items-center gap-3">
                             <div className={`w-2 h-6 ${sec.accent} rounded-full`} />
                             <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.15em]">{sec.label}</h3>
                             <div className="flex-1 h-px bg-slate-100" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {sf.map(f => (
                              <div key={f.id} onClick={() => { setShowPreviewAll(false); setSelectedId(f.id); }} className="bg-white rounded-[2rem] border border-slate-200 p-8 cursor-pointer hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-600/5 transition-all group relative">
                                <div className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 bg-indigo-50 text-indigo-600 p-3 rounded-2xl"><mousepointer2 className="w-4 h-4" /></div>
                                <FieldPreview field={f} />
                                {(f.validationRules?.length ?? 0) > 0 && (
                                  <div className="mt-6 pt-4 border-t border-slate-50 flex flex-wrap gap-2">
                                    {f.validationRules.map((r, i) => (
                                      <span key={i} className={`px-2.5 py-1 text-[10px] font-black rounded-lg border flex items-center gap-1.5 uppercase tracking-wider ${r.severity === "warning" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold"}`}>
                                        <Zap className="w-3 h-3" />{RULE_META.find(m => m.type === r.type)?.label ?? r.type}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="p-10 bg-slate-50 border-t border-slate-100 text-center">
                    <button onClick={() => setShowPreviewAll(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl">Return to Logic Terminal</button>
                  </div>
                </div>
              </motion.div>
            ) : selectedField ? (
              <motion.div key="single-edit" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-3xl mx-auto p-12">
                <div className="bg-white rounded-[3rem] border-2 border-indigo-400 p-10 shadow-2xl shadow-indigo-600/5 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-50" />
                  
                  <div className="flex items-center gap-3 mb-8">
                    <div className={`p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20`}>{typeIcon(selectedField.fieldType, "w-6 h-6")}</div>
                    <div className={`px-4 py-1.5 text-xs font-black rounded-full border-2 uppercase tracking-widest ${sectionColor(selectedField.section)}`}>{SECTION_MAP[selectedField.section]?.label}</div>
                    {selectedField.isCoreField && <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-400 text-white text-xs font-black rounded-full shadow-md shadow-amber-200"><Star className="w-3.5 h-3.5 fill-current" /> Core Component</div>}
                  </div>
                  
                  <FieldPreview field={selectedField} />
                  
                  <AnimatePresence>
                    {(selectedField.validationRules?.length ?? 0) > 0 && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-10 pt-8 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Integrity Gateways</p>
                        <div className="flex flex-wrap gap-3">
                          {selectedField.validationRules.map((r, i) => (
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} key={i} className={`px-4 py-2 text-xs font-bold rounded-[1.25rem] border-2 flex items-center gap-2.5 shadow-sm ${r.severity === "warning" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                              {r.severity === "warning" ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                              <span className="uppercase tracking-tight">{RULE_META.find(m => m.type === r.type)?.label ?? r.type}</span>
                              {r.value !== undefined && <div className="h-4 w-px bg-current opacity-20" />}
                              {r.value !== undefined && <span className="font-mono text-[11px] underline underline-offset-2">{r.value}</span>}
                              {r.compareToField && <ArrowRight className="w-3 h-3" />}
                              {r.compareToField && <span className="font-mono text-[11px] bg-white/50 px-1.5 rounded">{r.compareToField}</span>}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="mt-8 flex items-center justify-between px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-xs font-black text-slate-800">{fields.findIndex(f => f.id === selectedId) + 1}</div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">of {fields.length} Entities</span>
                  </div>
                  <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-x divide-slate-100">
                    <button 
                      onClick={() => { const i = fields.findIndex(f => f.id === selectedId); if (i > 0) setSelectedId(fields[i-1].id); }} 
                      className="px-6 py-3 font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all" 
                      disabled={fields.findIndex(f => f.id === selectedId) === 0}
                    >
                      Previous
                    </button>
                    <button 
                      onClick={() => { const i = fields.findIndex(f => f.id === selectedId); if (i < fields.length-1) setSelectedId(fields[i+1].id); }} 
                      className="px-6 py-3 font-black text-xs uppercase tracking-widest text-indigo-600 hover:bg-indigo-50/50 disabled:opacity-30 disabled:hover:bg-transparent transition-all" 
                      disabled={fields.findIndex(f => f.id === selectedId) === fields.length-1}
                    >
                      Next Entity
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center p-20">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-600/5 blur-3xl rounded-full" />
                  <div className="w-24 h-24 bg-white rounded-[2.5rem] border border-slate-200 flex items-center justify-center shadow-xl relative animate-pulse">
                    <LayoutTemplate className="w-10 h-10 text-slate-300" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest leading-none">Command Center</h3>
                <p className="text-sm text-slate-500 mt-3 max-w-xs font-medium leading-relaxed">Select a logical entity from the registry to configure its data bridge and integrity logic.</p>
                <div className="flex gap-3 mt-10">
                  <button onClick={addField} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-slate-900 shadow-2xl shadow-indigo-600/20 transition-all active:scale-95">
                    <Plus className="w-4 h-4" /> Assemble Component
                  </button>
                  <button onClick={() => setShowTemplates(true)} className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                    Browse Catalog
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Precision Edit Console */}
        <AnimatePresence>
          {selectedField && (
            <motion.div 
              initial={{ x: 340 }} 
              animate={{ x: 0 }} 
              exit={{ x: 340 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-[360px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.03)]"
            >
              <EditPanel field={selectedField} allFields={fields} onChange={u => updateField(selectedId!, u)} onSave={() => saveField(selectedField)} onDelete={() => deleteField(selectedId!)} onDuplicate={() => duplicateField(selectedField)} saving={saving} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
