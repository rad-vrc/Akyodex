/**
 * Akyo CRUD Operations Helper
 * 
 * Provides unified logic for Create, Update, Delete operations
 * to eliminate code duplication across API routes.
 */

import type { AkyoFormData } from './api-helpers';
import { jsonError } from './api-helpers';
import {
    commitAkyoCsv,
    createAkyoRecord,
    filterOutRecordById,
    findRecordById,
    formatAkyoCommitMessage,
    loadAkyoCsv,
    replaceRecordById,
} from './csv-utils';
import type { R2UploadOptions, R2UploadResult } from './r2-utils';
import { deleteImageFromR2, uploadImageToR2 } from './r2-utils';

type CrudOperation = 'add' | 'update' | 'delete';

interface CrudResult {
    success: boolean;
    message: string;
    commitUrl?: string;
    imageUploaded?: boolean;
    imageUpdated?: boolean;
    imageDeleted?: boolean;
    warning?: string;
}

interface DeleteData {
    id: string;
    avatarName?: string;
}

/**
 * Process Akyo CRUD operation (Add/Update/Delete)
 * Handles CSV commit first, then image operation
 */
export async function processAkyoCRUD(
    operation: CrudOperation,
    formData: AkyoFormData | DeleteData
): Promise<Response> {
    const { id } = formData;
    const { nickname, avatarName, attributes, creator, avatarUrl, notes, imageData } =
        'nickname' in formData ? formData : { nickname: '', avatarName: '', attributes: '', creator: '', avatarUrl: '', notes: '', imageData: undefined };

    try {
        // Step 1: Load CSV
        const { header, dataRecords, fileSha } = await loadAkyoCsv();

        // Step 2: Validate and prepare data based on operation
        let updatedRecords: string[][];
        let commitMessageAction: string;
        let successMessage: string;

        switch (operation) {
            case 'add': {
                // Check for duplicate ID
                const duplicateRecord = findRecordById(dataRecords, id);
                if (duplicateRecord) {
                    return jsonError(`ID ${id} は既に使用されています`, 409);
                }

                // Create and add new record
                const newRecord = createAkyoRecord({
                    id,
                    nickname,
                    avatarName,
                    attributes,
                    creator,
                    avatarUrl,
                    notes,
                });
                updatedRecords = [...dataRecords, newRecord];
                commitMessageAction = 'Add';
                successMessage = 'Akyoを登録しました';
                break;
            }

            case 'update': {
                // Check if record exists
                const existingRecord = findRecordById(dataRecords, id);
                if (!existingRecord) {
                    return jsonError(`ID: ${id} が見つかりませんでした`, 404);
                }

                // Create updated record
                const updatedRecord = createAkyoRecord({
                    id,
                    nickname,
                    avatarName,
                    attributes,
                    creator,
                    avatarUrl,
                    notes,
                });
                updatedRecords = replaceRecordById(dataRecords, id, updatedRecord);
                commitMessageAction = 'Update';
                successMessage = 'Akyoを更新しました';
                break;
            }

            case 'delete': {
                // Check if record exists
                const recordToDelete = findRecordById(dataRecords, id);
                if (!recordToDelete) {
                    return jsonError(`ID: ${id} が見つかりませんでした`, 404);
                }

                updatedRecords = filterOutRecordById(dataRecords, id);
                commitMessageAction = 'Delete';
                successMessage = `Akyoを削除しました (ID: ${id})`;
                break;
            }
        }

        // Step 3: Commit CSV to GitHub
        const commitMessage = formatAkyoCommitMessage(
            commitMessageAction as 'Add' | 'Update' | 'Delete',
            id,
            avatarName || ''
        );
        const commitData = await commitAkyoCsv({
            header,
            dataRecords: updatedRecords,
            fileSha,
            commitMessage,
        });

        // Step 4: Handle image operation (after successful CSV commit)
        const imageResult = await handleImageOperation(operation, id, imageData);

        // Step 5: Build response
        const result: CrudResult = {
            success: true,
            message: imageResult.warning ? `${successMessage}が、${imageResult.warning}` : successMessage,
            commitUrl: commitData.commit.html_url,
            ...imageResult,
        };

        return Response.json(result);

    } catch (error) {
        console.error(`[akyo-crud-${operation}] Error:`, error);
        return jsonError(
            error instanceof Error ? error.message : 'CSVの更新に失敗しました',
            500
        );
    }
}

/**
 * Handle image operations based on CRUD operation type
 */
async function handleImageOperation(
    operation: CrudOperation,
    id: string,
    imageData?: string
): Promise<Partial<CrudResult>> {
    if (operation === 'delete') {
        // Delete image from R2
        const deleteResult: R2UploadResult = await deleteImageFromR2(id);
        if (!deleteResult.success) {
            console.error('[akyo-crud-delete] Image deletion warning:', deleteResult.error);
        }
        return { imageDeleted: deleteResult.success };
    }

    // Add or Update: Upload image if provided
    if (!imageData) {
        return operation === 'add' ? { imageUploaded: false } : { imageUpdated: false };
    }

    const uploadOptions: R2UploadOptions = {
        contentType: 'image/webp',
        maxSizeBytes: 5 * 1024 * 1024,
    };

    const uploadResult: R2UploadResult = await uploadImageToR2(id, imageData, uploadOptions);

    if (!uploadResult.success) {
        const action = operation === 'add' ? 'アップロード' : '更新';
        console.error(`[akyo-crud-${operation}] Image ${action} error:`, uploadResult.error);
        return {
            [operation === 'add' ? 'imageUploaded' : 'imageUpdated']: false,
            warning: (uploadResult.error as string | undefined) || `画像の${action}に失敗しました。後で再試行してください。`,
        };
    }

    return operation === 'add' ? { imageUploaded: true } : { imageUpdated: true };
}
