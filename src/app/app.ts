import { Component, signal, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import mermaid from 'mermaid';


@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy {
  protected readonly title = signal('mermaid-sequence-ui');

  editorWidth = signal<number>(30);
  private resizing = false;

  // Edit Action Message dialog state
  showEditMessageDialog = signal<boolean>(false);
  editMessageValue = signal<string>('');
  editMessageActionIndex: number | null = null;



  onHandleMouseDown(event: MouseEvent) {
    this.resizing = true;
    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', this.onHandleMouseMove);
    window.addEventListener('mouseup', this.onHandleMouseUp);
  }

  onHandleMouseMove = (event: MouseEvent) => {
    if (!this.resizing) return;
    const split = document.querySelector('.split') as HTMLElement;
    if (!split) return;
    const rect = split.getBoundingClientRect();
    let percent = ((event.clientX - rect.left) / rect.width) * 100;
    percent = Math.max(10, Math.min(90, percent));
    this.editorWidth.set(percent);
  };

  onHandleMouseUp = () => {
    this.resizing = false;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', this.onHandleMouseMove);
    window.removeEventListener('mouseup', this.onHandleMouseUp);
  };

  onNameChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.participantName.set(value);
  }

  mermaidText = signal<string>(`sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice->>Bob: Hello Bob, how are you?\n    Bob-->>Alice: I am good thanks!`);
  diagramSvg = signal<SafeHtml>('');

  showParticipantModal = signal<boolean>(false);
  participantName = signal<string>('');

  showActionModal = signal<boolean>(false);
  showReorderDialog = signal<boolean>(false);
  // Reorder dialog data
  reorderItems: Array<{ idx: number; text: string; raw: string }> = [];
  private draggingReorderIndex: number | null = null;
  private reorderDragOverIndex: number | null = null;

  // Template bindings to read internal drag indices
  get draggingReorderIndexPublic(): number | null { return this.draggingReorderIndex; }
  get reorderDragOverIndexPublic(): number | null { return this.reorderDragOverIndex; }

  actionFrom = signal<string>('');
  actionTo = signal<string>('');
  actionMessage = signal<string>('');
  actionFieldBeingSet = signal<'from' | 'to'>('from');

  // --- Draggable Add Action dialog state and methods ---
  actionDialogLeft = 200;
  actionDialogTop = 100;
  private draggingActionDialog = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  get participants(): string[] {
    // Extract participants from the mermaid text
    const lines = this.mermaidText().split('\n');
    return lines
      .filter(line => line.trim().startsWith('participant '))
      .map(line => line.trim().replace('participant ', '').trim());
  }

  constructor(private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {
  mermaid.initialize({ startOnLoad: false });
  this.renderMermaid();
  // Global Escape key handler to close dialogs
  window.addEventListener('keydown', this.onGlobalKeyDown);

  // (edit dialog state initialized as class fields)
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.onGlobalKeyDown);
  }

  private onGlobalKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape' || ev.key === 'Esc') {
      let closed = false;

      if (this.showActionModal()) {
        this.closeActionModal();
        closed = true;
      }

      if (this.showParticipantModal()) {
        this.closeParticipantModal();
        closed = true;
      }

      if (this.showReorderDialog()) {
        this.closeReorderDialog();
        closed = true;
      }

      if(this.showEditMessageDialog()) {
        this.closeEditMessageDialog();
        closed = true;
      }

      if (closed) {
        ev.preventDefault();
      }
    }
  }

  onTextChange(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.mermaidText.set(value);
    this.renderMermaid();
  }

  async renderMermaid() {
    mermaid.initialize({ startOnLoad: false });
    mermaid.parseError = () => {};
    try {
      const { svg } = await mermaid.render('theGraph', this.mermaidText());
      const patched = this.patchDiagramSvg(svg);
      this.diagramSvg.set(this.sanitizer.bypassSecurityTrustHtml(patched));
    } catch (e) {
      this.diagramSvg.set(this.sanitizer.bypassSecurityTrustHtml('<p style="color:red">Invalid Mermaid syntax</p>'));
    }
  }

  addParticipant() {
    this.participantName.set('');
    this.showParticipantModal.set(true);
    setTimeout(() => {
      const input = document.getElementById('new') as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }

  closeParticipantModal() {
    this.showParticipantModal.set(false);
  }

  submitParticipant() {
    const name = this.participantName().trim();
    if (name && !this.participants.includes(name)) {
      const lines = this.mermaidText().split('\n');
      lines.splice(1, 0, `    participant ${name}`);
      this.mermaidText.set(lines.join('\n'));
      this.renderMermaid();
    }
    this.closeParticipantModal();
  }


  addAction() {
    this.actionFrom.set('');
    this.actionTo.set('');
    this.actionMessage.set('');
    this.actionFieldBeingSet.set('from');
    this.actionDialogLeft = 200;
    this.actionDialogTop = 100;
    this.showActionModal.set(true);
  }
  setActionField(field: 'from' | 'to') {
    this.actionFieldBeingSet.set(field);
  }

  closeActionModal() {
    this.showActionModal.set(false);
  }

  submitAction() {
    const from = this.actionFrom();
    const to = this.actionTo();
    const message = this.actionMessage().trim();
    if (from && to && message) {
      this.mermaidText.set(this.mermaidText() + `\n    ${from}->>${to}: ${message}`);
      this.renderMermaid();
    }
    this.closeActionModal();
  }

  openReorderDialog() {
    // Build list of action lines from mermaidText
    const lines = this.mermaidText().split('\n');
    const actionIndices: number[] = [];
    const items: Array<{ idx: number; text: string; raw: string }> = [];
    lines.forEach((ln, i) => {
      const trimmed = ln.trim();
      // crude detection: line contains '->' or '-->' and a ':'
      if ((trimmed.includes('->') || trimmed.includes('-->')) && trimmed.includes(':')) {
        actionIndices.push(i);
        items.push({ idx: i, text: trimmed, raw: ln });
      }
    });
    this.reorderItems = items;
    this.showReorderDialog.set(true);
  }

  closeReorderDialog() {
    this.showReorderDialog.set(false);
  }

  onReorderDragStart(event: DragEvent, index: number) {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', String(index));
    event.dataTransfer.effectAllowed = 'move';
    this.draggingReorderIndex = index;
    // add a small timeout so the class application happens after drag starts
    setTimeout(() => this.cdr.markForCheck(), 0);
  }

  // Template helper: whether a reorder drag is active
  isReorderDragging(): boolean {
    return this.draggingReorderIndex !== null;
  }

  onReorderDragOver(event: DragEvent, targetIndex: number) {
    // Live move items while hovering over them
    event.preventDefault();
    if (this.draggingReorderIndex === null) return;
    const fromIndex = this.draggingReorderIndex;
    // track visual hover state
    this.reorderDragOverIndex = targetIndex;
    this.cdr.markForCheck();
    if (fromIndex === targetIndex) return;
    const item = this.reorderItems.splice(fromIndex, 1)[0];
    // After removal, compute correct insertion index
    let insertionIndex = targetIndex;
    if (fromIndex < targetIndex) {
      insertionIndex = targetIndex - 1;
    }
    // Clamp
    if (insertionIndex < 0) insertionIndex = 0;
    if (insertionIndex > this.reorderItems.length) insertionIndex = this.reorderItems.length;
    this.reorderItems.splice(insertionIndex, 0, item);
    this.draggingReorderIndex = insertionIndex;
    this.cdr.markForCheck();
  }

  onReorderDrop(event: DragEvent) {
    event.preventDefault();
    this.draggingReorderIndex = null;
    this.reorderDragOverIndex = null;
    this.cdr.markForCheck();
  }

  onReorderDragEnd(event: DragEvent) {
    this.draggingReorderIndex = null;
    this.reorderDragOverIndex = null;
    this.cdr.markForCheck();
  }

  applyReorder() {
    // Map reorderItems back into mermaidText by replacing lines at recorded indices
    const lines = this.mermaidText().split('\n');
    const actionIndices = this.reorderItems.map(it => it.idx).slice();
    // Sort actionIndices ascending to know where to place
    actionIndices.sort((a, b) => a - b);
    // Replace in order: for each sorted index, take the next item from reorderItems
    for (let i = 0; i < actionIndices.length; i++) {
      const targetIdx = actionIndices[i];
      const newText = this.reorderItems[i]?.raw ?? this.reorderItems[i]?.text ?? '';
      // Preserve original leading whitespace
      const leading = lines[targetIdx].match(/^[\s]*/)?.[0] ?? '';
      lines[targetIdx] = leading + newText.trim();
    }
    this.mermaidText.set(lines.join('\n'));
    this.renderMermaid();
    this.closeReorderDialog();
  }

  onActionFromChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.actionFrom.set(value);
  }

  onActionToChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.actionTo.set(value);
  }

  onActionMessageChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.actionMessage.set(value);
  }

  onActionDialogHandleDown(event: MouseEvent) {
    event.preventDefault();
    this.draggingActionDialog = true;
    this.dragOffsetX = event.clientX - this.actionDialogLeft;
    this.dragOffsetY = event.clientY - this.actionDialogTop;
    window.addEventListener('mousemove', this.onActionDialogDragMove);
    window.addEventListener('mouseup', this.onActionDialogDragEnd);
  }

  onActionDialogDragMove = (event: MouseEvent) => {
    if (!this.draggingActionDialog) return;
    this.actionDialogLeft = event.clientX - this.dragOffsetX;
    this.actionDialogTop = event.clientY - this.dragOffsetY;
    this.cdr.markForCheck();
  };

  onActionDialogDragEnd = () => {
    this.draggingActionDialog = false;
    window.removeEventListener('mousemove', this.onActionDialogDragMove);
    window.removeEventListener('mouseup', this.onActionDialogDragEnd);
  };

  // Called from the template after diagram is rendered
  onDiagramClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if(!target) return;

    // If Add Action dialog is open, handle participant selection
    if (this.showActionModal()) {
      // Handle clicking on participant label text
      if (target.classList.contains('participant-label')) {
        const name = target.textContent?.trim();
        this._setActionParticipant(name);
        return;
      }
      // Handle clicking on participant rect
      if (target.tagName === 'rect' && (target.classList.contains('actor-top') ||  target.classList.contains('actor-bottom'))) {
        // Try to get the participant name
        let name = target.getAttribute('name');
        if (!name) {
          // Fallback: try to find the next sibling <text> with class participant-label
          const text = target.parentElement?.querySelector('text.participant-label');
          name = text?.textContent?.trim() || '';
        }
        this._setActionParticipant(name);
        return;
      }
    }
    // Handle clicking on action message text for editing
    if (target.hasAttribute('data-action-idx')) {
      // Find the action index by data-action-idx attribute
      const idxStr = target.getAttribute('data-action-idx');
      if (idxStr) {
        const idx = parseInt(idxStr, 10);
        if (!isNaN(idx)) {
          // Extract the message text from the clicked element
          this.editMessageActionIndex = idx;
          this.editMessageValue.set(target.textContent?.trim() || '');
          this.showEditMessageDialog.set(true);
        }
      }
    }
  }

  private _setActionParticipant(name: string | undefined) {
    if (!name) return;

    if (this.actionFieldBeingSet() === 'from') {
      this.actionFrom.set(name);
      this.actionFieldBeingSet.set('to');
    } else {
      this.actionTo.set(name);
    }

    // Re-render to update highlight
    this.renderMermaid();
    // Focus message input if both from and to are set
    setTimeout(() => {
      if (this.actionFrom() && this.actionTo()) {
        const input = document.getElementById('message') as HTMLInputElement;
        if (input) { input.focus(); }
      }
    }, 0);
  }

  patchDiagramSvg(svg: string): string {
    let patched = svg;
    // Add class to <text> elements that are participant labels
    patched = patched.replace(/(<text[^>]*data-id="actor-([^"]+)"[^>]*>)([^<]+)(<\/text>)/g, (m: any, p1: any, p2: any, p3: any, p4: any) => {
      if (p1.includes('class="')) {
        return p1.replace('class="', 'class="participant-label ') + p3 + p4;
      } else {
        return p1.replace('<text', '<text class="participant-label"') + p3 + p4;
      }
    });
    // Add class to <rect> elements that are actor-top
    patched = patched.replace(/(<rect[^>]*class="[^"]*actor-top[^"]*"[^>]*data-id="actor-([^"]+)"[^>]*>)/g, (m: any, rectTag: string, name: string) => {
      let highlight = '';
      if (
        (this.actionFieldBeingSet() === 'from' && name === this.actionFrom()) ||
        (this.actionFieldBeingSet() === 'to' && name === this.actionTo())
      ) {
        highlight = ' participant-rect-selected';
      }
      if (rectTag.includes('class="')) {
        return rectTag.replace('class="', `class="participant-rect${highlight} `);
      } else {
        return rectTag.replace('<rect', `<rect class="participant-rect${highlight}"`);
      }
    });
    // Add class and data-action-idx to message text elements (arrows)
    // This regex matches <text ...>message</text> for arrows
    let actionIdx = 0;
    patched = patched.replace(/(<text[^>]*>)([^<]+)(<\/text>)/g, (m: any, p1: any, p2: any, p3: any) => {
      // Only patch if this is likely a message (not a participant label)
      if (p1.includes('participant-label')) return m;
      // Heuristic: message text is not a number and not empty
      if (/^\s*\d+\s*$/.test(p2) || !p2.trim()) return m;
      // Add class and data-action-idx
      if (p1.includes('class="')) {
        return p1.replace('class="', `class="messageText `) + `<tspan data-action-idx="${actionIdx++}">${p2}</tspan>` + p3;
      } else {
        return p1.replace('<text', `<text class="messageText"`) + `<tspan data-action-idx="${actionIdx++}">${p2}</tspan>` + p3;
      }
    });
    return patched;
  }

  // --- Edit Action Message dialog logic ---
  closeEditMessageDialog() {
    this.showEditMessageDialog.set(false);
    this.editMessageActionIndex = null;
  }

  onEditMessageInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.editMessageValue.set(value);
  }

  submitEditMessage() {
    if (this.editMessageActionIndex == null) return;
    const lines = this.mermaidText().split('\n');
    // Find all action lines (arrows with ':')
    let actionIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if ((trimmed.includes('->') || trimmed.includes('-->')) && trimmed.includes(':')) {
        if (actionIdx === this.editMessageActionIndex) {
          // Replace message after ':'
          const parts = lines[i].split(':');
          if (parts.length > 1) {
            parts[parts.length - 1] = ' ' + this.editMessageValue().trim();
            lines[i] = parts.join(':');
          }
          break;
        }
        actionIdx++;
      }
    }
    this.mermaidText.set(lines.join('\n'));
    this.renderMermaid();
    this.closeEditMessageDialog();
  }
}
