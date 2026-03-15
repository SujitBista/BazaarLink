# Schema Notes

- A User may have one marketplace role or multiple roles depending on design
- A Vendor has many Products
- A Product belongs to one Vendor
- An Order has many OrderItems
- Each OrderItem belongs to one Vendor through its Product or vendor reference
- Payment should track status clearly
- Refunds and payouts should be auditable
