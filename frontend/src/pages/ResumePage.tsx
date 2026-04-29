import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Briefcase, Code2 } from 'lucide-react'
import { resumeApi } from '../services/api'

export function ResumePage() {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: resume, refetch } = useQuery({
    queryKey: ['resume'],
    queryFn: () => resumeApi.getCurrent(),
  })

  const { data: skillsGap } = useQuery({
    queryKey: ['skills-gap'],
    queryFn: () => resumeApi.getSkillsGap(),
    enabled: !!resume,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => resumeApi.upload(file),
    onSuccess: () => {
      toast.success('Resume uploaded successfully!')
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Upload failed')
    },
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      uploadMutation.mutate(file)
    } else {
      toast.error('Please upload a PDF file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  const parsedData = resume?.parsedData

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resume Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Upload your resume to get personalized interview questions
        </p>
      </div>

      {/* Upload Area */}
      {!resume && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Upload your resume</h3>
          <p className="text-muted-foreground mt-1">
            Drag and drop your PDF resume here, or click to browse
          </p>
          {uploadMutation.isPending && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Uploading...</span>
            </div>
          )}
        </div>
      )}

      {/* Resume Status */}
      {resume && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{resume?.fileName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {resume?.parsingStatus === 'completed' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Parsed successfully</span>
                    </>
                  ) : resume?.parsingStatus === 'processing' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing...</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Parsing failed</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Upload New
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Parsed Data */}
      {parsedData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skills */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Code2 className="h-5 w-5" />
              Detected Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {parsedData.skills?.map((skill: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5" />
              Experience
            </h3>
            <div className="space-y-3">
              {parsedData.experience?.slice(0, 3).map((exp: any, i: number) => (
                <div key={i} className="border-l-2 border-primary/20 pl-4">
                  <p className="font-medium">{exp.title}</p>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Skills Gap */}
      {skillsGap && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Skills Gap Analysis</h3>
          {skillsGap?.missingSkills?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Consider learning:</p>
              <div className="flex flex-wrap gap-2">
                {skillsGap.missingSkills.map((skill: any, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm"
                  >
                    {skill.skillName}
                  </span>
                ))}
              </div>
            </div>
          )}
          {skillsGap?.recommendations?.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Recommendations:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {skillsGap.recommendations.map((rec: string, i: number) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
