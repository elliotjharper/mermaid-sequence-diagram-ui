import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, Signal, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import mermaid from 'mermaid';
import { patchDiagramSvg } from './patch-diagram-svg';
import {
    createDocument,
    Document,
    loadStorageState,
    updateActiveDocument,
    updateDocument,
} from './storage.service';

@Component({
    selector: 'app-root',
    imports: [CommonModule],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
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
    public showEditMessageDialog = signal<boolean>(false);
    public editMessageValue = signal<string>('');
    public editMessageActionIndex: number | null = null;

    // --- Draggable Edit Action Message dialog state ---
    public editMessageDialogLeft = 320;
    public editMessageDialogTop = 180;
    private draggingEditMessageDialog = false;
    private editMessageDragOffsetX = 0;
    private editMessageDragOffsetY = 0;

    // Edit Participant dialog state
    public showEditParticipantDialog = signal<boolean>(false);
    public editParticipantValue = signal<string>('');
    public editParticipantOriginalName: string | null = null;

    // --- Draggable Edit Participant dialog state and methods ---
    public editParticipantDialogLeft = 300;
    public editParticipantDialogTop = 150;
    private draggingEditParticipantDialog = false;
    private editParticipantDragOffsetX = 0;
    private editParticipantDragOffsetY = 0;

    private _mermaidText = signal<string>('');
    public mermaidText: Signal<string> = this._mermaidText;
    public diagramSvg = signal<SafeHtml>('');

    // Document management
    public documents = signal<Document[]>([]);
    public activeDocumentId = signal<string | null>(null);
    public showDocumentSelector = signal<boolean>(false);
    public editingDocumentId: string | null = null;
    public editingDocumentName = signal<string>('');

    public activeDocument(): Document | null {
        const docId = this.activeDocumentId();
        return this.documents().find((d) => d.id === docId) || null;
    }

    public showParticipantModal = signal<boolean>(false);
    public participantName = signal<string>('');

    // --- Draggable Add Participant dialog state and methods ---
    public participantDialogLeft = 240;
    public participantDialogTop = 120;
    private draggingParticipantDialog = false;
    private participantDragOffsetX = 0;
    private participantDragOffsetY = 0;

    public showActionModal = signal<boolean>(false);
    public showReorderDialog = signal<boolean>(false);
    // Reorder dialog data
    public reorderItems: Array<{ idx: number; text: string; raw: string }> = [];
    protected draggingReorderIndex: number | null = null;
    protected reorderDragOverIndex: number | null = null;

    // --- Draggable Reorder Dialog state ---
    public reorderDialogLeft = 220;
    public reorderDialogTop = 140;
    private draggingReorderDialog = false;
    private reorderDialogDragOffsetX = 0;
    private reorderDialogDragOffsetY = 0;

    public actionFrom = signal<string>('');
    public actionTo = signal<string>('');
    public actionMessage = signal<string>('');
    public actionFieldBeingSet = signal<'from' | 'to'>('from');

    // --- Draggable Add Action dialog state and methods ---
    public actionDialogLeft = typeof window !== 'undefined' ? (window.innerWidth - 400) / 2 : 200;
    public actionDialogTop = 280;
    private draggingActionDialog = false;
    private dragOffsetX = 0;
    private dragOffsetY = 0;

    constructor(private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {
        mermaid.initialize({ startOnLoad: false });

        this.loadAndApplyStorageState();

        // Global Escape key handler to close dialogs
        window.addEventListener('keydown', this.onGlobalKeyDown);
    }

    ngOnInit() {
        // Already loaded in constructor
    }

    public participants(): string[] {
        // Extract participants from the mermaid text
        const lines = this.mermaidText().split('\n');
        return lines
            .filter((line) => line.trim().startsWith('participant '))
            .map((line) => line.trim().replace('participant ', '').trim());
    }

    // Document management methods
    private loadAndApplyStorageState(): void {
        // Load documents from storage
        const storageState = loadStorageState();
        this.documents.set(storageState.documents);
        this.activeDocumentId.set(storageState.activeDocumentId);

        // Set the mermaidText from active document
        const activeDoc = this.activeDocument();
        if (activeDoc) {
            this._mermaidText.set(activeDoc.content);
            this.renderMermaid();
        }
    }

    private updateActiveDocument(content: string): void {
        const activeDoc = this.activeDocument();
        if (!activeDoc) {
            return;
        }

        updateDocument({ ...activeDoc, content });
        this.loadAndApplyStorageState();
    }

    public switchDocument(docId: string): void {
        updateActiveDocument(docId);
        this.loadAndApplyStorageState();
        this.showDocumentSelector.set(false);
    }

    public createNewDocument(): void {
        createDocument('Untitled Diagram');
        this.loadAndApplyStorageState();
    }

    public startRenamingDocument(docId: string): void {
        const doc = this.documents().find((d) => d.id === docId);
        if (!doc) return;

        this.editingDocumentId = docId;
        this.editingDocumentName.set(doc.name);
        setTimeout(() => {
            const input = document.getElementById('docNameInput') as HTMLInputElement;
            if (input) {
                input.focus();
                input.select();
            }
        }, 0);
    }

    public cancelRenamingDocument(): void {
        this.editingDocumentId = null;
        this.editingDocumentName.set('');
    }

    public saveDocumentName(): void {
        if (!this.editingDocumentId) return;

        const newName = this.editingDocumentName().trim();
        if (!newName) {
            this.cancelRenamingDocument();
            return;
        }

        const targetDoc = this.documents().find(
            (document) => document.id === this.editingDocumentId
        );
        if (!targetDoc) {
            throw new Error('Cannot find the doc that we are trying to rename');
        }
        const updatedDocument = {
            ...targetDoc,
            name: newName,
        };
        updateDocument(updatedDocument);
        this.loadAndApplyStorageState();

        this.cancelRenamingDocument();
    }

    public deleteDocument(docId: string): void {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        this.deleteDocument(docId);
        this.loadAndApplyStorageState();
    }

    public toggleDocumentSelector(): void {
        this.showDocumentSelector.set(!this.showDocumentSelector());
    }

    public onDocumentNameInput(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.editingDocumentName.set(value);
    }

    public ngOnDestroy(): void {
        window.removeEventListener('keydown', this.onGlobalKeyDown);
        this.stopZoom(); // Clean up zoom timer
    }

    public onHandleMouseDown(event: MouseEvent) {
        this.resizing = true;
        document.body.style.cursor = 'ew-resize';
        window.addEventListener('mousemove', this.onHandleMouseMove);
        window.addEventListener('mouseup', this.onHandleMouseUp);
    }

    public onHandleMouseMove = (event: MouseEvent) => {
        if (!this.resizing) {
            return;
        }
        const split = document.querySelector('.split') as HTMLElement;
        if (!split) {
            return;
        }
        const rect = split.getBoundingClientRect();
        let percent = ((event.clientX - rect.left) / rect.width) * 100;
        percent = Math.max(10, Math.min(90, percent));
        this.editorWidth.set(percent);
    };

    public onHandleMouseUp = () => {
        this.resizing = false;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', this.onHandleMouseMove);
        window.removeEventListener('mouseup', this.onHandleMouseUp);
    };

    // --- Zoom functionality ---
    public resetZoom() {
        this.zoomLevel.set(1);
    }

    // Continuous zoom methods
    public startZoomIn() {
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

    public startZoomOut() {
        if (this.isZooming) {
            return;
        }

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

    public stopZoom() {
        if (this.zoomTimer) {
            clearInterval(this.zoomTimer);
            this.zoomTimer = null;
        }
        this.isZooming = false;
    }

    public onNameChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.participantName.set(value);
    }

    private onGlobalKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape' || ev.key === 'Esc') {
            let closed = false;

            if (this.showDocumentSelector()) {
                this.showDocumentSelector.set(false);
                closed = true;
            }

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

    public onTextChange(event: Event) {
        const value = (event.target as HTMLTextAreaElement).value;
        this.updateActiveDocument(value);
    }

    public async renderMermaid() {
        mermaid.initialize({ startOnLoad: false });
        mermaid.parseError = () => {};
        try {
            const mermaidText = this.mermaidText();
            const { svg } = await mermaid.render('theGraph', mermaidText);
            const patched = patchDiagramSvg(svg);
            this.diagramSvg.set(this.sanitizer.bypassSecurityTrustHtml(patched));
        } catch (e) {
            this.diagramSvg.set(
                this.sanitizer.bypassSecurityTrustHtml(
                    '<p style="color:red">Invalid Mermaid syntax</p>'
                )
            );
        }
    }

    public addParticipant() {
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

    public submitParticipant() {
        const name = this.participantName().trim();
        if (name && !this.participants().includes(name)) {
            const lines = this.mermaidText().split('\n');

            // Find the position to insert the new participant
            // Look for the last existing participant declaration
            let insertIndex = 1; // Default: after sequenceDiagram line

            for (let i = 1; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                if (trimmed.startsWith('participant ')) {
                    insertIndex = i + 1; // After the last participant
                } else if (trimmed && !trimmed.startsWith('participant ')) {
                    // If we hit a non-participant, non-empty line, stop looking
                    break;
                }
            }

            lines.splice(insertIndex, 0, `    participant ${name}`);
            this.updateActiveDocument(lines.join('\n'));
        }
        this.closeParticipantModal();
    }

    // --- Edit Participant methods ---
    private _openEditParticipantDialog(name: string | undefined) {
        if (!name) {
            return;
        }
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

    public closeEditParticipantDialog() {
        this.showEditParticipantDialog.set(false);
        this.editParticipantOriginalName = null;
    }

    public onEditParticipantInput(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.editParticipantValue.set(value);
    }

    public submitEditParticipant() {
        const newName = this.editParticipantValue().trim();
        const originalName = this.editParticipantOriginalName;

        if (!newName || !originalName || newName === originalName) {
            this.closeEditParticipantDialog();
            return;
        }

        // Check if new name already exists
        if (this.participants().includes(newName)) {
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

        this.updateActiveDocument(updatedLines.join('\n'));
        this.closeEditParticipantDialog();
    }

    public deleteParticipant() {
        const participantToDelete = this.editParticipantOriginalName;
        if (!participantToDelete) return;

        // Remove participant and all actions involving this participant
        const lines = this.mermaidText().split('\n');
        const filteredLines = lines.filter((line) => {
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) {
                return true;
            }

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

        this.updateActiveDocument(filteredLines.join('\n'));
        this.closeEditParticipantDialog();
    }

    public addAction() {
        this.actionFrom.set('');
        this.actionTo.set('');
        this.actionMessage.set('');
        this.actionFieldBeingSet.set('from');
        // Center horizontally and position lower to avoid participant rectangles
        this.actionDialogLeft = (window.innerWidth - 400) / 2; // Assuming dialog width ~400px
        this.actionDialogTop = 280; // 30px below participant rectangles (estimated at ~250px)
        this.showActionModal.set(true);
    }
    public setActionField(field: 'from' | 'to') {
        this.actionFieldBeingSet.set(field);
    }

    public closeActionModal() {
        this.showActionModal.set(false);
    }

    public submitAction() {
        const from = this.actionFrom();
        const to = this.actionTo();
        const message = this.actionMessage().trim();
        if (from && to && message) {
            this.updateActiveDocument(this.mermaidText() + `\n    ${from}->>${to}: ${message}`);
        }
        this.closeActionModal();
    }

    public openReorderDialog() {
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

    public closeReorderDialog() {
        this.showReorderDialog.set(false);
    }

    public onReorderDragStart(event: DragEvent, index: number) {
        if (!event.dataTransfer) return;
        event.dataTransfer.setData('text/plain', String(index));
        event.dataTransfer.effectAllowed = 'move';
        this.draggingReorderIndex = index;
        // add a small timeout so the class application happens after drag starts
        setTimeout(() => this.cdr.markForCheck(), 0);
    }

    // Template helper: whether a reorder drag is active
    public isReorderDragging(): boolean {
        return this.draggingReorderIndex !== null;
    }

    public onReorderDragOver(event: DragEvent, targetIndex: number) {
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

    public onReorderDrop(event: DragEvent) {
        event.preventDefault();
        this.draggingReorderIndex = null;
        this.reorderDragOverIndex = null;
        this.cdr.markForCheck();
    }

    public onReorderDragEnd(event: DragEvent) {
        this.draggingReorderIndex = null;
        this.reorderDragOverIndex = null;
        this.cdr.markForCheck();
    }

    public applyReorder() {
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
        this.updateActiveDocument(lines.join('\n'));
        this.closeReorderDialog();
    }

    public onActionFromChange(event: Event) {
        const value = (event.target as HTMLSelectElement).value;
        this.actionFrom.set(value);
    }

    public onActionToChange(event: Event) {
        const value = (event.target as HTMLSelectElement).value;
        this.actionTo.set(value);
    }

    public onActionMessageChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.actionMessage.set(value);
    }

    public onActionDialogHandleDown(event: MouseEvent) {
        event.preventDefault();
        this.draggingActionDialog = true;
        this.dragOffsetX = event.clientX - this.actionDialogLeft;
        this.dragOffsetY = event.clientY - this.actionDialogTop;
        window.addEventListener('mousemove', this.onActionDialogDragMove);
        window.addEventListener('mouseup', this.onActionDialogDragEnd);
    }

    public onActionDialogDragMove = (event: MouseEvent) => {
        if (!this.draggingActionDialog) return;
        this.actionDialogLeft = event.clientX - this.dragOffsetX;
        this.actionDialogTop = event.clientY - this.dragOffsetY;
        this.cdr.markForCheck();
    };

    public onActionDialogDragEnd = () => {
        this.draggingActionDialog = false;
        window.removeEventListener('mousemove', this.onActionDialogDragMove);
        window.removeEventListener('mouseup', this.onActionDialogDragEnd);
    };

    // --- Edit Participant Dialog Drag methods ---
    public onEditParticipantDialogHandleDown(event: MouseEvent) {
        event.preventDefault();
        this.draggingEditParticipantDialog = true;
        this.editParticipantDragOffsetX = event.clientX - this.editParticipantDialogLeft;
        this.editParticipantDragOffsetY = event.clientY - this.editParticipantDialogTop;
        window.addEventListener('mousemove', this.onEditParticipantDialogDragMove);
        window.addEventListener('mouseup', this.onEditParticipantDialogDragEnd);
    }

    public onEditParticipantDialogDragMove = (event: MouseEvent) => {
        if (!this.draggingEditParticipantDialog) return;
        this.editParticipantDialogLeft = event.clientX - this.editParticipantDragOffsetX;
        this.editParticipantDialogTop = event.clientY - this.editParticipantDragOffsetY;
        this.cdr.markForCheck();
    };

    public onEditParticipantDialogDragEnd = () => {
        this.draggingEditParticipantDialog = false;
        window.removeEventListener('mousemove', this.onEditParticipantDialogDragMove);
        window.removeEventListener('mouseup', this.onEditParticipantDialogDragEnd);
    };

    // --- Edit Action Message Dialog Drag methods ---
    public onEditMessageDialogHandleDown(event: MouseEvent) {
        event.preventDefault();
        this.draggingEditMessageDialog = true;
        this.editMessageDragOffsetX = event.clientX - this.editMessageDialogLeft;
        this.editMessageDragOffsetY = event.clientY - this.editMessageDialogTop;
        window.addEventListener('mousemove', this.onEditMessageDialogDragMove);
        window.addEventListener('mouseup', this.onEditMessageDialogDragEnd);
    }

    public onEditMessageDialogDragMove = (event: MouseEvent) => {
        if (!this.draggingEditMessageDialog) return;
        this.editMessageDialogLeft = event.clientX - this.editMessageDragOffsetX;
        this.editMessageDialogTop = event.clientY - this.editMessageDragOffsetY;
        this.cdr.markForCheck();
    };

    public onEditMessageDialogDragEnd = () => {
        this.draggingEditMessageDialog = false;
        window.removeEventListener('mousemove', this.onEditMessageDialogDragMove);
        window.removeEventListener('mouseup', this.onEditMessageDialogDragEnd);
    };

    // --- Add Participant Dialog Drag methods ---
    public onParticipantDialogHandleDown(event: MouseEvent) {
        event.preventDefault();
        this.draggingParticipantDialog = true;
        this.participantDragOffsetX = event.clientX - this.participantDialogLeft;
        this.participantDragOffsetY = event.clientY - this.participantDialogTop;
        window.addEventListener('mousemove', this.onParticipantDialogDragMove);
        window.addEventListener('mouseup', this.onParticipantDialogDragEnd);
    }

    public onParticipantDialogDragMove = (event: MouseEvent) => {
        if (!this.draggingParticipantDialog) return;
        this.participantDialogLeft = event.clientX - this.participantDragOffsetX;
        this.participantDialogTop = event.clientY - this.participantDragOffsetY;
        this.cdr.markForCheck();
    };

    public onParticipantDialogDragEnd = () => {
        this.draggingParticipantDialog = false;
        window.removeEventListener('mousemove', this.onParticipantDialogDragMove);
        window.removeEventListener('mouseup', this.onParticipantDialogDragEnd);
    };

    // --- Reorder Dialog Drag methods ---
    public onReorderDialogHandleDown(event: MouseEvent) {
        event.preventDefault();
        this.draggingReorderDialog = true;
        this.reorderDialogDragOffsetX = event.clientX - this.reorderDialogLeft;
        this.reorderDialogDragOffsetY = event.clientY - this.reorderDialogTop;
        window.addEventListener('mousemove', this.onReorderDialogDragMove);
        window.addEventListener('mouseup', this.onReorderDialogDragEnd);
    }

    public onReorderDialogDragMove = (event: MouseEvent) => {
        if (!this.draggingReorderDialog) return;
        this.reorderDialogLeft = event.clientX - this.reorderDialogDragOffsetX;
        this.reorderDialogTop = event.clientY - this.reorderDialogDragOffsetY;
        this.cdr.markForCheck();
    };

    public onReorderDialogDragEnd = () => {
        this.draggingReorderDialog = false;
        window.removeEventListener('mousemove', this.onReorderDialogDragMove);
        window.removeEventListener('mouseup', this.onReorderDialogDragEnd);
    };

    // Called from the template after diagram is rendered
    public onDiagramClick(event: MouseEvent) {
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
                (target.classList.contains('actor-top') ||
                    target.classList.contains('actor-bottom'))
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
                (target.classList.contains('actor-top') ||
                    target.classList.contains('actor-bottom'))
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

    // --- Edit Action Message dialog logic ---
    public closeEditMessageDialog() {
        this.showEditMessageDialog.set(false);
        this.editMessageActionIndex = null;
    }

    public onEditMessageInput(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.editMessageValue.set(value);
    }

    public submitEditMessage() {
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
        this.updateActiveDocument(lines.join('\n'));
        this.closeEditMessageDialog();
    }

    public deleteAction() {
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

        this.updateActiveDocument(filteredLines.join('\n'));
        this.closeEditMessageDialog();
    }

    public arrangeParticipants() {
        const lines = this.mermaidText().split('\n');

        // Find all explicitly declared participants
        const declaredParticipants = new Set<string>();
        lines.forEach((line) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('participant ')) {
                const participantName = trimmed.replace('participant ', '').trim();
                declaredParticipants.add(participantName);
            }
        });

        // Find all participants used in actions
        const usedParticipants = new Set<string>();
        lines.forEach((line) => {
            const trimmed = line.trim();
            // Check if line contains arrows (actions)
            if (
                trimmed.includes('->') ||
                trimmed.includes('-->') ||
                trimmed.includes('->>') ||
                trimmed.includes('-->>') ||
                trimmed.includes('-x') ||
                trimmed.includes('--x')
            ) {
                // Extract participant names from action lines
                // Split by arrow types and extract participant names
                const arrowPattern = /(->>?|-->>?|-x|--x)/;
                const parts = trimmed.split(arrowPattern);

                if (parts.length >= 3) {
                    // Extract 'from' participant (before arrow)
                    const fromPart = parts[0].trim();
                    if (fromPart) usedParticipants.add(fromPart);

                    // Extract 'to' participant (after arrow, before message)
                    const toPart = parts[2].split(':')[0].trim();
                    if (toPart) usedParticipants.add(toPart);
                }
            }
        });

        // Find participants that are declared but not used in actions
        const unusedParticipants = new Set<string>();
        declaredParticipants.forEach((participant) => {
            if (!usedParticipants.has(participant)) {
                unusedParticipants.add(participant);
            }
        });

        // Filter lines: remove participant declarations only for participants that are used in actions
        const filteredLines = lines.filter((line) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('participant ')) {
                const participantName = trimmed.replace('participant ', '').trim();
                // Keep declarations for unused participants, remove for used ones
                return unusedParticipants.has(participantName);
            }
            return true; // Keep all non-participant lines
        });

        this.updateActiveDocument(filteredLines.join('\n'));
    }

    public async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.mermaidText());
            // Optional: Show a brief success message
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            // Fallback for older browsers
            this.fallbackCopyToClipboard(this.mermaidText());
        }
    }

    private fallbackCopyToClipboard(text: string) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
    }

    public async pasteFromClipboard() {
        try {
            const clipboardText = await navigator.clipboard.readText();
            if (!clipboardText.trim().startsWith('sequenceDiagram')) {
                throw new Error('Clipboard content does not start with "sequenceDiagram"');
            }

            this.updateActiveDocument(clipboardText);
        } catch (err) {
            console.error('Failed to read from clipboard:', err);
            console.warn('Paste functionality requires HTTPS or localhost for security reasons');
        }
    }
}
