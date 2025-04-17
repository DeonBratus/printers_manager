const handleSubmit = async (e) => {
  e.preventDefault();
  if (isSubmitting) return; // Предотвращаем повторное нажатие

  setIsSubmitting(true);
  try {
    await login({ email, password });
  } catch (error) {
    console.error('Login failed:', error);
  } finally {
    setIsSubmitting(false);
  }
};
