import React, { useMemo } from 'react';
import { Grid, FormControl, InputLabel, MenuItem, Select } from '@mui/material';

const ContentAssignmentFields = ({
  categories = [],
  courses = [],
  chapters = [],
  values,
  onChange,
  disabled = false,
  showCategory = true,
  showCourse = true,
  showChapter = true,
  categoryLabel = 'Category *',
  courseLabel = 'Course *',
  chapterLabel = 'Chapter *',
}) => {
  const filteredCourses = useMemo(() => {
    if (!values.category_id) return [];

    const categoryId = parseInt(values.category_id, 10);
    return Number.isNaN(categoryId)
      ? []
      : courses.filter((course) => course.category_id === categoryId);
  }, [courses, values.category_id]);

  const filteredChapters = useMemo(() => {
    if (!values.course_id) return [];

    const courseId = parseInt(values.course_id, 10);
    return Number.isNaN(courseId)
      ? []
      : chapters.filter((chapter) => chapter.course_id === courseId);
  }, [chapters, values.course_id]);

  const updateField = (name, value) => {
    const updates = { [name]: value };

    if (name === 'category_id') {
      updates.course_id = '';
      updates.chapter_id = '';
    }

    if (name === 'course_id') {
      updates.chapter_id = '';
    }

    onChange(updates);
  };

  const md = [showCategory, showCourse, showChapter].filter(Boolean).length === 3 ? 4 : 6;

  return (
    <>
      {showCategory && (
        <Grid item xs={12} md={md}>
          <FormControl fullWidth>
            <InputLabel>{categoryLabel}</InputLabel>
            <Select
              name="category_id"
              value={values.category_id || ''}
              onChange={(event) => updateField('category_id', event.target.value)}
              label={categoryLabel}
              disabled={disabled}
            >
              <MenuItem value="">Select Category</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      )}

      {showCourse && (
        <Grid item xs={12} md={showChapter && showCategory ? md : 12}>
          <FormControl fullWidth>
            <InputLabel>{courseLabel}</InputLabel>
            <Select
              name="course_id"
              value={values.course_id || ''}
              onChange={(event) => updateField('course_id', event.target.value)}
              label={courseLabel}
              disabled={disabled || (showCategory && !values.category_id)}
            >
              <MenuItem value="">Select Course</MenuItem>
              {(showCategory ? filteredCourses : courses).map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      )}

      {showChapter && (
        <Grid item xs={12} md={showCategory && showCourse ? md : 12}>
          <FormControl fullWidth>
            <InputLabel>{chapterLabel}</InputLabel>
            <Select
              name="chapter_id"
              value={values.chapter_id || ''}
              onChange={(event) => updateField('chapter_id', event.target.value)}
              label={chapterLabel}
              disabled={disabled || (showCourse && !values.course_id)}
            >
              <MenuItem value="">Select Chapter</MenuItem>
              {(showCourse ? filteredChapters : chapters).map((chapter) => (
                <MenuItem key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      )}
    </>
  );
};

const areEqual = (prevProps, nextProps) => (
  prevProps.categories === nextProps.categories &&
  prevProps.courses === nextProps.courses &&
  prevProps.chapters === nextProps.chapters &&
  prevProps.disabled === nextProps.disabled &&
  prevProps.showCategory === nextProps.showCategory &&
  prevProps.showCourse === nextProps.showCourse &&
  prevProps.showChapter === nextProps.showChapter &&
  prevProps.categoryLabel === nextProps.categoryLabel &&
  prevProps.courseLabel === nextProps.courseLabel &&
  prevProps.chapterLabel === nextProps.chapterLabel &&
  prevProps.values?.category_id === nextProps.values?.category_id &&
  prevProps.values?.course_id === nextProps.values?.course_id &&
  prevProps.values?.chapter_id === nextProps.values?.chapter_id
);

export default React.memo(ContentAssignmentFields, areEqual);
