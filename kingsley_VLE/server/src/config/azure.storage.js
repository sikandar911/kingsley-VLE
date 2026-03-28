import { BlobServiceClient } from '@azure/storage-blob'

const getContainerClient = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME
  if (!connectionString) throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set')
  if (!containerName) throw new Error('AZURE_STORAGE_CONTAINER_NAME is not set')
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
  return blobServiceClient.getContainerClient(containerName)
}

/**
 * Upload a buffer to Azure Blob Storage.
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename (used to derive extension)
 * @param {string} mimeType - MIME type
 * @returns {{ url: string, blobName: string }}
 */
export const uploadToAzure = async (buffer, originalName, mimeType) => {
  const containerClient = getContainerClient()
  const ext = originalName.includes('.') ? originalName.split('.').pop().toLowerCase() : 'bin'
  const blobName = `${crypto.randomUUID()}.${ext}`
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: mimeType },
  })

  return { url: blockBlobClient.url, blobName }
}

/**
 * Delete a blob by its blobName (slug stored on the File record).
 * Silently succeeds if blob does not exist.
 */
export const deleteFromAzure = async (blobName) => {
  if (!blobName) return
  try {
    const containerClient = getContainerClient()
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)
    await blockBlobClient.deleteIfExists()
  } catch (err) {
    console.error('Azure delete error:', err.message)
  }
}
