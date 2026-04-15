import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob'
import { randomUUID } from 'crypto'

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
  const blobName = `${randomUUID()}.${ext}`
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

/**
 * Generate a SAS URL for an existing blob by its name (slug).
 * @param {string} blobName - The blob name/slug stored on the File record
 * @returns {string} SAS-signed URL valid for 7 days (short-lived for security)
 */
export const generateSecureSASUrl = async (blobName) => {
  if (!blobName) return null
  try {
    const containerClient = getContainerClient()
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    // Start 5 minutes in the past to absorb server clock skew
    const startsOn = new Date(Date.now() - 5 * 60 * 1000)
    const expiresOn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const sasUrl = await blockBlobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
      protocol: 'https',
    })

    return sasUrl
  } catch (err) {
    console.error('Error generating SAS URL for blob:', err.message)
    return null
  }
}
