import * as yup from 'yup';

const schema = yup.object().shape({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email format').required('Email is required'),
  age: yup.number().positive('Age must be a positive number').integer('Age must be an integer').required('Age is required'),
});

const validateData = async (data) => {
  try {
    await schema.validate(data);
    console.log('Validation successful');
  } catch (err) {
    console.error('Validation error:', err.errors);
  }
};

const data = {
  name: 'John Doe',
  email: 'johndoe@example.com',
  age: 30,
};

validateData(data);

