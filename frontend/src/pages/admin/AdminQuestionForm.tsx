import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { X, Save, Code } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminQuestionForm({ question, onClose }: { question?: any, onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEditing = !!question;

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    problemStatement: '',
    difficulty: 'easy',
    type: 'CODING',
    skillId: '',
  });

  const { data: skills } = useQuery({
    queryKey: ['admin-skills'],
    queryFn: () => adminApi.getSkills(),
  });

  useEffect(() => {
    if (isEditing && question) {
      setFormData({
        title: question.title || '',
        slug: question.slug || '',
        description: question.description || '',
        problemStatement: question.problemStatement || '',
        difficulty: question.difficulty || 'easy',
        type: question.type || 'CODING',
        skillId: question.skillId || '',
      });
    }
  }, [isEditing, question]);

  const mutation = useMutation({
    mutationFn: (data: any) => isEditing 
      ? adminApi.updateQuestion(question.id, data) 
      : adminApi.createQuestion(data),
    onSuccess: () => {
      toast.success(isEditing ? 'Question updated' : 'Question created');
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save question');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.skillId) {
      toast.error('Please select a skill category');
      return;
    }
    mutation.mutate(formData);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      // Auto-generate slug if we're creating a new question
      slug: !isEditing ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : prev.slug
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl overflow-hidden animate-fade-in relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Code className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Edit Question' : 'Create New Question'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={handleTitleChange}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Two Sum"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-muted-foreground"
                placeholder="e.g. two-sum"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 capitalize"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 capitalize"
              >
                <option value="CODING">Coding</option>
                <option value="SYSTEM_DESIGN">System Design</option>
                <option value="BEHAVIORAL">Behavioral</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Skill Category</label>
              <select
                required
                value={formData.skillId}
                onChange={(e) => setFormData(prev => ({ ...prev, skillId: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="" disabled>Select a skill</option>
                {skills?.data?.map((skill: any) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Short Description</label>
            <textarea
              required
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder="A brief summary of what the question asks..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Full Problem Statement (Markdown)</label>
            <textarea
              required
              rows={6}
              value={formData.problemStatement}
              onChange={(e) => setFormData(prev => ({ ...prev, problemStatement: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
              placeholder="Write the full problem description using markdown..."
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border bg-background hover:bg-muted font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center gap-2 transition-colors disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {mutation.isPending ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
