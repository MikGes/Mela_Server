const express = require("express");
const router = express.Router();
const provider = require("../../schemas/provider");
const customer = require("../../schemas/customer")
const bcrypt = require('bcrypt');
//create a new provider Api
router.post("/create", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if a user with the customer email already exists
    const existingUser = await provider.findOne({ email });

    if (existingUser) {
      return res.json({
        success: false,
        message: "Email already exists"
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user in the database
    await provider.create({
      email,
      password: hashedPassword,
      type_of_user:"provider"
    });

    res.status(200).json({
      success: true
    });
  } catch (error) {
    console.error('Error creating provider:', error);
    res.json({
      success: false,
      message: error.message
    });
  }
});
//login provider Api
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user with the provided email
    const target_provider = await provider.findOne({ email });

    // If no user is found with the provided email, return an error
    if (!target_provider) {
      return res.json({
        success: false,
        message: "Email not found"
      });
    }

    // Compare the provided password with the hashed password from the database
    const passwordMatch = await bcrypt.compare(password, target_provider.password);

    // If passwords don't match, return an error
    if (!passwordMatch) {
      return res.json({
        success: false,
        message: "Incorrect password"
      });
    }

    // If email and password are correct, return a success message
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: target_provider
    });
  } catch (error) {
    console.error('Error logging in provider:', error);
    res.json({
      success: false,
      message: "Internal server error"
    });
  }
});

//get all the providers Api
router.get("/getProviders/:job", async (req, res) => {
    const { job } = req.params;
    try {
      const providers = await provider.find({ services: { $in: [job] } });
      res.status(200).json(providers);
    } catch (error) {
      console.error("Error fetching providers:", error);
      res.status(400).send("Can't get providers");
    }
  });

  //get all the customer who rated a provider
  router.get("/getRaters/:providerId", async (req, res) => {
    const { providerId } = req.params;
    try {
        await provider.findById(providerId) 
        .populate({
            path: 'ratedBy',
            populate: {
                path: 'rated_customer',
                model: 'customer',
                select: 'name customer_image' // Select the fields you want to retrieve from the customer document
            }
        }).then((provider)=>{
            const customers = provider.ratedBy;
            console.log(typeof(customers))
            res.status(200).json(
                customers,
            )     
        })
     
    } catch (error) {
       res.status(400).send(error.message); 
    }
  })
  //route to get all the request services
  router.get("/getServiceRequests/:providerId", async (req, res) => {
    const { providerId } = req.params;
    try {
        await provider.findById(providerId) 
        .populate({
            path: 'serviceRequest',
            populate: {
                path: 'request_customer_id',
                model: 'customer',
                select: 'name customer_image customer_phone' // Select the fields you want to retrieve from the customer document
            }
        }).then((provider)=>{
            const services = provider.serviceRequest;
            res.status(200).json(
                services,
            )     
        })
     
    } catch (error) {
       res.status(400).send(error.message); 
    }
  })
  //route to reject a service
  router.put('/rejectService/:providerId/:serviceId/:customerId', async (req, res) => {
    const { providerId, serviceId,customerId } = req.params;
    
    try {
      const target_provider = await provider.findById(providerId);
      if (!target_provider) {
        return res.status(404).json({ error: 'Provider not found' });
      }
  
      // Find the index of the service with the given serviceId
      const serviceIndex = target_provider.serviceRequest.findIndex(service => service.serviceId === serviceId);
      if (serviceIndex === -1) {
        return res.status(404).json({ error: 'Service not found' });
      }
  
      // Remove the service from the serviceRequest array
      target_provider.serviceRequest.splice(serviceIndex, 1);
  
      // Save the updated provider document
      await target_provider.save();
      
      //Customer SIDEEE
      const target_customer = await customer.findById(customerId);
    if (!target_customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Find the requested service with the given serviceId
    const service = target_customer.requested_Providers.find(service => service.serviceId === serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Update the status of the service to "rejected"
    service.status = 'rejected';

    // Save the updated customer document
    await target_customer.save();
  
      res.json({ success: true, message: 'Success' });
    } catch (error) {
      console.error('Error rejecting service:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
  //route to accept a service
  router.put('/acceptService/:providerId/:serviceId/:customerId', async (req, res) => {
    const { providerId, serviceId,customerId } = req.params;
    
    try {
      // Provider side...making the status to accepted
      const target_provider = await provider.findById(providerId);
      if (!target_provider) {
        return res.status(404).json({ error: 'Provider not found' });
      }
  
      // Find the requested service with the given serviceId
      const target_service = target_provider.serviceRequest.find(service => service.serviceId === serviceId);
      if (!target_service) {
        return res.status(404).json({ error: 'Service not found' });
      }
  
      // Update the status of the service to "accepted"
      target_service.status = 'accepted';
  
      // Save the updated customer document
      await target_provider.save();
      
      //Customer SIDEEE
      const target_customer = await customer.findById(customerId);
    if (!target_customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Find the requested service with the given serviceId
    const service = target_customer.requested_Providers.find(service => service.serviceId === serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Update the status of the service to "rejected"
    service.status = 'accepted';

    // Save the updated customer document
    await target_customer.save();
  
      res.json({ success: true, message: 'Success' });
    } catch (error) {
      console.error('Error rejecting service:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
  //route to update the rating attribute in the provider collection
  router.put('/updateRating/:providerId', async (req, res) => {
    const { providerId } = req.params;
    const { rating } = req.body;
    try {
      await provider.findByIdAndUpdate(providerId, { rating });
    }catch (error) {
      res.json({ success: false, message: error.message });
    }
    return res.json({ success: true, message: 'Success' });
  })
  //route to update providers location
  router.put('/updateLocation/:providerId', async (req, res) => {
    const { latitude, longitude } = req.body;
    const providerId = req.params.providerId;

    try {
        // Find the customer by ID
        const target_provider = await provider.findById(providerId);

        if (!target_provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Update latitude and longitude
        target_provider.location.latitude = latitude;
        target_provider.location.longitude = longitude;

        // Save the updated customer
        await target_provider.save();

        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Error updating location:', error);
        res.json({ message: 'Internal server error' });
    }
});
//route to update providers information
router.put('/updateInfo/:providerId', async (req, res) => {
    const { name,
      provider_image, 
      provider_description, 
      provider_phone, 
      // services,
      // qualifications,
      // responsiblePersonInfo,
      // idCardPhoto,
      gender
    } = req.body;
    const providerId = req.params.providerId;

    try {
        // Find the customer by ID
        const target_provider = await provider.findById(providerId);

        if (!target_provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Update name, description, address, phone, email
        target_provider.name = name;
        target_provider.provider_image = provider_image;
        target_provider.provider_description = provider_description;
        target_provider.provider_phone = provider_phone;
        // target_provider.services = services;
        // target_provider.qualifications = qualifications;
        // target_provider.responsiblePersonInfo = responsiblePersonInfo;
        // target_provider.idCardPhoto = idCardPhoto;
        target_provider.gender = gender;
        target_provider.completed_profile = true;

        // Save the updated customer
        await target_provider.save();

        res.json({ message: 'Information updated successfully' });
    } catch (error) {
        console.error('Error updating information:', error);
        res.json({ message: 'Internal server error' });
    }
});
//route to get a specific provider
router.get('/getProvider/:providerId', async (req, res) => {
  const providerId = req.params.providerId;
  try {
    const provider = await provider.findById(providerId);
    if (!provider) {
      return res.json({ error: 'Provider not found' });
    }
    res.json({user: provider});
  } catch (error) {
    console.error('Error getting provider:', error);
    res.json({ error: 'Server error' });
  }
});

module.exports = router