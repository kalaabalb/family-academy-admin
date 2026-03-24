import axiosInstance from './axiosConfig';

const uploadsApi = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return axiosInstance.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default uploadsApi;
