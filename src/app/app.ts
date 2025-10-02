import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import mermaid from 'mermaid';

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  protected readonly title = signal('mermaid-sequence-ui');

  editorWidth = signal<number>(30);
  private resizing = false;

  // Zoom functionality
  zoomLevel = signal<number>(1);
  private readonly minZoom = 0.25;
  private readonly maxZoom = 3;
  private readonly continuousZoomStep = 0.05;
  private readonly continuousZoomInterval = 150; // milliseconds
  private zoomTimer: any = null;
  private isZooming = false;

  // Edit Action Message dialog state
  showEditMessageDialog = signal<boolean>(false);
  editMessageValue = signal<string>('');
  editMessageActionIndex: number | null = null;

  // Edit Participant dialog state
  showEditParticipantDialog = signal<boolean>(false);
  editParticipantValue = signal<string>('');
  editParticipantOriginalName: string | null = null;

  // --- Draggable Edit Participant dialog state and methods ---
  editParticipantDialogLeft = 300;
  editParticipantDialogTop = 150;
  private draggingEditParticipantDialog = false;
  private editParticipantDragOffsetX = 0;
  private editParticipantDragOffsetY = 0;

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

  // --- Zoom functionality ---
  resetZoom() {
    this.zoomLevel.set(1);
  }

  // Continuous zoom methods
  startZoomIn() {
    if (this.isZooming) return;

    // Immediate zoom on mousedown
    const currentZoom = this.zoomLevel();
    const newZoom = Math.min(this.maxZoom, currentZoom + this.continuousZoomStep);
    this.zoomLevel.set(newZoom);

    this.isZooming = true;
    this.zoomTimer = setInterval(() => {
      const currentZoom = this.zoomLevel();
      const newZoom = Math.min(this.maxZoom, currentZoom + this.continuousZoomStep);
      this.zoomLevel.set(newZoom);
      if (newZoom >= this.maxZoom) {
        this.stopZoom();
      }
    }, this.continuousZoomInterval);
  }

  startZoomOut() {
    if (this.isZooming) return;

    // Immediate zoom on mousedown
    const currentZoom = this.zoomLevel();
    const newZoom = Math.max(this.minZoom, currentZoom - this.continuousZoomStep);
    this.zoomLevel.set(newZoom);

    this.isZooming = true;
    this.zoomTimer = setInterval(() => {
      const currentZoom = this.zoomLevel();
      const newZoom = Math.max(this.minZoom, currentZoom - this.continuousZoomStep);
      this.zoomLevel.set(newZoom);
      if (newZoom <= this.minZoom) {
        this.stopZoom();
      }
    }, this.continuousZoomInterval);
  }

  stopZoom() {
    if (this.zoomTimer) {
      clearInterval(this.zoomTimer);
      this.zoomTimer = null;
    }
    this.isZooming = false;
  }

  onNameChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.participantName.set(value);
  }

  mermaidText = signal<string>(
    `sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice->>Bob: Hello Bob, how are you?\n    Bob-->>Alice: I am good thanks!`
  );
  diagramSvg = signal<SafeHtml>('');

  showParticipantModal = signal<boolean>(false);
  participantName = signal<string>('');

  // --- Draggable Add Participant dialog state and methods ---
  participantDialogLeft = 240;
  participantDialogTop = 120;
  private draggingParticipantDialog = false;
  private participantDragOffsetX = 0;
  private participantDragOffsetY = 0;

  showActionModal = signal<boolean>(false);
  showReorderDialog = signal<boolean>(false);
  // Reorder dialog data
  reorderItems: Array<{ idx: number; text: string; raw: string }> = [];
  private draggingReorderIndex: number | null = null;
  private reorderDragOverIndex: number | null = null;

  // Template bindings to read internal drag indices
  get draggingReorderIndexPublic(): number | null {
    return this.draggingReorderIndex;
  }
  get reorderDragOverIndexPublic(): number | null {
    return this.reorderDragOverIndex;
  }

  actionFrom = signal<string>('');
  actionTo = signal<string>('');
  actionMessage = signal<string>('');
  actionFieldBeingSet = signal<'from' | 'to'>('from');

  // --- Draggable Add Action dialog state and methods ---
  actionDialogLeft = typeof window !== 'undefined' ? (window.innerWidth - 400) / 2 : 200;
  actionDialogTop = 280;
  private draggingActionDialog = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  get participants(): string[] {
    // Extract participants from the mermaid text
    const lines = this.mermaidText().split('\n');
    return lines
      .filter((line) => line.trim().startsWith('participant '))
      .map((line) => line.trim().replace('participant ', '').trim());
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
    this.stopZoom(); // Clean up zoom timer
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

      if (this.showEditMessageDialog()) {
        this.closeEditMessageDialog();
        closed = true;
      }

      if (this.showEditParticipantDialog()) {
        this.closeEditParticipantDialog();
        closed = true;
      }

      if (closed) {
        ev.preventDefault();
      }
    }
  };

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
      this.diagramSvg.set(
        this.sanitizer.bypassSecurityTrustHtml('<p style="color:red">Invalid Mermaid syntax</p>')
      );
    }
  }

  addParticipant() {
    this.participantName.set('');
    this.participantDialogLeft = 240;
    this.participantDialogTop = 120;
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

  // --- Edit Participant methods ---
  private _openEditParticipantDialog(name: string | undefined) {
    if (!name) return;
    this.editParticipantOriginalName = name;
    this.editParticipantValue.set(name);
    this.editParticipantDialogLeft = 300;
    this.editParticipantDialogTop = 150;
    this.showEditParticipantDialog.set(true);
    setTimeout(() => {
      const input = document.getElementById('editParticipantInput') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  closeEditParticipantDialog() {
    this.showEditParticipantDialog.set(false);
    this.editParticipantOriginalName = null;
  }

  onEditParticipantInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.editParticipantValue.set(value);
  }

  submitEditParticipant() {
    const newName = this.editParticipantValue().trim();
    const originalName = this.editParticipantOriginalName;

    if (!newName || !originalName || newName === originalName) {
      this.closeEditParticipantDialog();
      return;
    }

    // Check if new name already exists
    if (this.participants.includes(newName)) {
      alert('A participant with this name already exists!');
      return;
    }

    // Update participant name in mermaidText
    const lines = this.mermaidText().split('\n');
    const updatedLines = lines.map((line) => {
      // Update participant declaration
      if (line.trim().startsWith(`participant ${originalName}`)) {
        return line.replace(`participant ${originalName}`, `participant ${newName}`);
      }
      // Update in actions/messages (arrows)
      return line.replace(new RegExp(`\\b${originalName}\\b`, 'g'), newName);
    });

    this.mermaidText.set(updatedLines.join('\n'));
    this.renderMermaid();
    this.closeEditParticipantDialog();
  }

  deleteParticipant() {
    const participantToDelete = this.editParticipantOriginalName;
    if (!participantToDelete) return;

    // Remove participant and all actions involving this participant
    const lines = this.mermaidText().split('\n');
    const filteredLines = lines.filter((line) => {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) return true;

      // Remove participant declaration
      if (trimmedLine.startsWith(`participant ${participantToDelete}`)) {
        return false;
      }

      // Remove actions/messages involving this participant
      // Check if the line contains arrows (any type of Mermaid arrow)
      const hasArrow =
        trimmedLine.includes('->') ||
        trimmedLine.includes('-->') ||
        trimmedLine.includes('->>') ||
        trimmedLine.includes('-->>') ||
        trimmedLine.includes('-x') ||
        trimmedLine.includes('--x');

      if (hasArrow) {
        // Use regex to match participant names more accurately
        // This will match the participant name as a whole word in arrow syntax
        const participantRegex = new RegExp(
          `\\b${participantToDelete.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
        );
        if (participantRegex.test(trimmedLine)) {
          return false;
        }
      }

      return true;
    });

    this.mermaidText.set(filteredLines.join('\n'));
    this.renderMermaid();
    this.closeEditParticipantDialog();
  }

  addAction() {
    this.actionFrom.set('');
    this.actionTo.set('');
    this.actionMessage.set('');
    this.actionFieldBeingSet.set('from');
    // Center horizontally and position lower to avoid participant rectangles
    this.actionDialogLeft = (window.innerWidth - 400) / 2; // Assuming dialog width ~400px
    this.actionDialogTop = 280; // 30px below participant rectangles (estimated at ~250px)
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
    const actionIndices = this.reorderItems.map((it) => it.idx).slice();
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

  // --- Edit Participant Dialog Drag methods ---
  onEditParticipantDialogHandleDown(event: MouseEvent) {
    event.preventDefault();
    this.draggingEditParticipantDialog = true;
    this.editParticipantDragOffsetX = event.clientX - this.editParticipantDialogLeft;
    this.editParticipantDragOffsetY = event.clientY - this.editParticipantDialogTop;
    window.addEventListener('mousemove', this.onEditParticipantDialogDragMove);
    window.addEventListener('mouseup', this.onEditParticipantDialogDragEnd);
  }

  onEditParticipantDialogDragMove = (event: MouseEvent) => {
    if (!this.draggingEditParticipantDialog) return;
    this.editParticipantDialogLeft = event.clientX - this.editParticipantDragOffsetX;
    this.editParticipantDialogTop = event.clientY - this.editParticipantDragOffsetY;
    this.cdr.markForCheck();
  };

  onEditParticipantDialogDragEnd = () => {
    this.draggingEditParticipantDialog = false;
    window.removeEventListener('mousemove', this.onEditParticipantDialogDragMove);
    window.removeEventListener('mouseup', this.onEditParticipantDialogDragEnd);
  };

  // --- Add Participant Dialog Drag methods ---
  onParticipantDialogHandleDown(event: MouseEvent) {
    event.preventDefault();
    this.draggingParticipantDialog = true;
    this.participantDragOffsetX = event.clientX - this.participantDialogLeft;
    this.participantDragOffsetY = event.clientY - this.participantDialogTop;
    window.addEventListener('mousemove', this.onParticipantDialogDragMove);
    window.addEventListener('mouseup', this.onParticipantDialogDragEnd);
  }

  onParticipantDialogDragMove = (event: MouseEvent) => {
    if (!this.draggingParticipantDialog) return;
    this.participantDialogLeft = event.clientX - this.participantDragOffsetX;
    this.participantDialogTop = event.clientY - this.participantDragOffsetY;
    this.cdr.markForCheck();
  };

  onParticipantDialogDragEnd = () => {
    this.draggingParticipantDialog = false;
    window.removeEventListener('mousemove', this.onParticipantDialogDragMove);
    window.removeEventListener('mouseup', this.onParticipantDialogDragEnd);
  };

  // Called from the template after diagram is rendered
  onDiagramClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (!target) return;

    // If Add Action dialog is open, handle participant selection
    if (this.showActionModal()) {
      // Handle clicking on participant label text
      if (target.classList.contains('participant-label')) {
        const name = target.textContent?.trim();
        this._setActionParticipant(name);
        return;
      }
      // Handle clicking on participant rect
      if (
        target.tagName === 'rect' &&
        (target.classList.contains('actor-top') || target.classList.contains('actor-bottom'))
      ) {
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
    } else if (!this.showParticipantModal() && !this.showEditParticipantDialog()) {
      // If no dialogs are open, handle participant editing
      // Handle clicking on participant label text
      if (target.classList.contains('participant-label')) {
        const name = target.textContent?.trim();
        this._openEditParticipantDialog(name);
        return;
      }
      // Handle clicking on participant rect
      if (
        target.tagName === 'rect' &&
        (target.classList.contains('actor-top') || target.classList.contains('actor-bottom'))
      ) {
        // Try to get the participant name
        let name = target.getAttribute('name');
        if (!name) {
          // Fallback: try to find the next sibling <text> with class participant-label
          const text = target.parentElement?.querySelector('text.participant-label');
          name = text?.textContent?.trim() || '';
        }
        this._openEditParticipantDialog(name);
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
          setTimeout(() => {
            const input = document.getElementById('editMessage') as HTMLInputElement;
            if (input) {
              input.focus();
              input.select();
            }
          }, 0);
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
        if (input) {
          input.focus();
        }
      }
    }, 0);
  }

  patchDiagramSvg(svg: string): string {
    let patched = svg;

    // Add class to <text> elements that are participant labels
    patched = patched.replace(
      /(<text[^>]*data-id="actor-([^"]+)"[^>]*>)([^<]+)(<\/text>)/g,
      (m: any, p1: any, p2: any, p3: any, p4: any) => {
        if (p1.includes('class="')) {
          return p1.replace('class="', 'class="participant-label ') + p3 + p4;
        } else {
          return p1.replace('<text', '<text class="participant-label"') + p3 + p4;
        }
      }
    );

    // Add class to <rect> elements that are actor-top or actor-bottom
    patched = patched.replace(
      /(<rect[^>]*class="[^"]*actor-(top|bottom)[^"]*"[^>]*>)/g,
      (m: any, rectTag: string, actorType: string) => {
        if (rectTag.includes('class="')) {
          return rectTag.replace('class="', 'class="participant-rect ');
        } else {
          return rectTag.replace('<rect', '<rect class="participant-rect"');
        }
      }
    );
    // Add class and data-action-idx to message text elements (arrows)
    // This regex matches <text ...>message</text> for arrows
    let actionIdx = 0;
    patched = patched.replace(
      /(<text[^>]*>)([^<]+)(<\/text>)/g,
      (m: any, p1: any, p2: any, p3: any) => {
        // Only patch if this is likely a message (not a participant label)
        if (p1.includes('participant-label')) return m;
        // Heuristic: message text is not a number and not empty
        if (/^\s*\d+\s*$/.test(p2) || !p2.trim()) return m;
        // Add class and data-action-idx
        if (p1.includes('class="')) {
          return (
            p1.replace('class="', `class="messageText `) +
            `<tspan data-action-idx="${actionIdx++}">${p2}</tspan>` +
            p3
          );
        } else {
          return (
            p1.replace('<text', `<text class="messageText"`) +
            `<tspan data-action-idx="${actionIdx++}">${p2}</tspan>` +
            p3
          );
        }
      }
    );
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

  deleteAction() {
    if (this.editMessageActionIndex == null) return;

    const lines = this.mermaidText().split('\n');
    const filteredLines = [];
    let actionIdx = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Check if this is an action line (arrows with ':')
      if (
        (trimmed.includes('->') ||
          trimmed.includes('-->') ||
          trimmed.includes('->>') ||
          trimmed.includes('-->>')) &&
        trimmed.includes(':')
      ) {
        if (actionIdx === this.editMessageActionIndex) {
          // Skip this line (delete the action)
          actionIdx++;
          continue;
        }
        actionIdx++;
      }

      // Keep all other lines
      filteredLines.push(lines[i]);
    }

    this.mermaidText.set(filteredLines.join('\n'));
    this.renderMermaid();
    this.closeEditMessageDialog();
  }
}
