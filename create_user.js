db.users.updateOne(
  {email: 'admin@carlogic.com'},
  {$set: {
    created_at: new Date(),
    user_id: 'admin-user-001',
    is_active: true
  }}
);
db.users.findOne({email: 'admin@carlogic.com'});
