package com.messo.repository;

import com.messo.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    long countByResolvedFalse();

    long countByResolvedTrue();
}
